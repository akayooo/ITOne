/**
 * Utilities for converting between different BPMN formats
 */

/**
 * Converts PiperFlow text to BPMN XML.
 * This is a simple conversion that creates a basic BPMN diagram.
 * 
 * @param piperflowText The PiperFlow text to convert
 * @returns BPMN XML string
 */
export const convertPiperflowToBpmn = (piperflowText: string): string => {
  console.log('Converting PiperFlow to BPMN, input:', piperflowText);
  
  if (!piperflowText || typeof piperflowText !== 'string') {
    console.error('Invalid PiperFlow text:', piperflowText);
    return EMPTY_DIAGRAM;
  }
  
  // Parse the PiperFlow text
  const lines = piperflowText.split('\n').filter(line => line.trim() !== '');
  console.log('Parsed lines:', lines.length);
  
  // Extract title, pools, lanes, activities, and flows
  let title = 'Process';
  const pools: Array<{
    name: string;
    lanes: Array<{
      name: string;
      elements: Array<{
        type: 'start' | 'end' | 'task' | 'gateway';
        id: string;
        name?: string;
      }>;
      flows: string[];
    }>;
  }> = [];
  
  let currentPool: typeof pools[0] | null = null;
  let currentLane: typeof pools[0]['lanes'][0] | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse title
    if (trimmed.startsWith('title:')) {
      title = trimmed.substring('title:'.length).trim();
      continue;
    }
    
    // Parse pool
    if (trimmed.startsWith('pool:')) {
      const poolName = trimmed.substring('pool:'.length).trim();
      currentPool = { name: poolName, lanes: [] };
      pools.push(currentPool);
      currentLane = null;
      continue;
    }
    
    // Parse lane (must be inside a pool)
    if (trimmed.startsWith('lane:') && currentPool) {
      const laneName = trimmed.substring('lane:'.length).trim();
      currentLane = { name: laneName, elements: [], flows: [] };
      currentPool.lanes.push(currentLane);
      continue;
    }
    
    // Parse elements and flows (must be inside a lane)
    if (currentLane) {
      // Start event: (start) as start_event
      if (trimmed.includes('(start)')) {
        const match = trimmed.match(/\(start\)\s+as\s+(\w+)/);
        if (match) {
          currentLane.elements.push({
            type: 'start',
            id: match[1]
          });
        }
        continue;
      }
      
      // End event: (end) as end_event
      if (trimmed.includes('(end)')) {
        const match = trimmed.match(/\(end\)\s+as\s+(\w+)/);
        if (match) {
          currentLane.elements.push({
            type: 'end',
            id: match[1]
          });
        }
        continue;
      }
      
      // Task: [Task name] as task_id
      if (trimmed.includes('[') && trimmed.includes(']')) {
        const match = trimmed.match(/\[(.*?)\]\s+as\s+(\w+)/);
        if (match) {
          currentLane.elements.push({
            type: 'task',
            id: match[2],
            name: match[1]
          });
        }
        continue;
      }
      
      // Gateway: Gateway? as gateway_id
      if (trimmed.includes('?') && trimmed.includes(' as ')) {
        const match = trimmed.match(/(.*?)\?\s+as\s+(\w+)/);
        if (match) {
          currentLane.elements.push({
            type: 'gateway',
            id: match[2],
            name: match[1]
          });
        }
        continue;
      }
      
      // Flow: a -> b -> c
      if (trimmed.includes('->')) {
        currentLane.flows.push(trimmed);
      }
    }
  }
  
  // Build the BPMN XML
  let bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="Definitions_${generateId()}"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="BPMN Editor"
  exporterVersion="1.0">
  <bpmn:collaboration id="Collaboration_${generateId()}">
    <bpmn:documentation>${title}</bpmn:documentation>`;
  
  // Add each pool
  pools.forEach((pool, poolIndex) => {
    const poolId = `Pool_${generateId()}`;
    bpmnXml += `
    <bpmn:participant id="${poolId}" name="${escapeXml(pool.name)}" processRef="Process_${generateId()}" />`;
  });
  
  bpmnXml += `
  </bpmn:collaboration>`;
  
  // Add process for each pool
  pools.forEach((pool, poolIndex) => {
    const processId = `Process_${generateId()}`;
    
    bpmnXml += `
  <bpmn:process id="${processId}" isExecutable="false">`;
    
    // Process-level lanes
    pool.lanes.forEach((lane, laneIndex) => {
      const laneId = `Lane_${generateId()}`;
      bpmnXml += `
    <bpmn:laneSet id="LaneSet_${generateId()}">
      <bpmn:lane id="${laneId}" name="${escapeXml(lane.name)}">`;
      
      // Lane references all elements
      lane.elements.forEach(element => {
        bpmnXml += `
        <bpmn:flowNodeRef>${element.id}</bpmn:flowNodeRef>`;
      });
      
      bpmnXml += `
      </bpmn:lane>
    </bpmn:laneSet>`;
      
      // Add elements
      lane.elements.forEach(element => {
        switch (element.type) {
          case 'start':
            bpmnXml += `
    <bpmn:startEvent id="${element.id}" name="Start">
      <bpmn:outgoing>Flow_${generateId()}</bpmn:outgoing>
    </bpmn:startEvent>`;
            break;
          case 'end':
            bpmnXml += `
    <bpmn:endEvent id="${element.id}" name="End">
      <bpmn:incoming>Flow_${generateId()}</bpmn:incoming>
    </bpmn:endEvent>`;
            break;
          case 'task':
            bpmnXml += `
    <bpmn:task id="${element.id}" name="${escapeXml(element.name || '')}">
      <bpmn:incoming>Flow_${generateId()}</bpmn:incoming>
      <bpmn:outgoing>Flow_${generateId()}</bpmn:outgoing>
    </bpmn:task>`;
            break;
          case 'gateway':
            bpmnXml += `
    <bpmn:exclusiveGateway id="${element.id}" name="${escapeXml(element.name || '')}">
      <bpmn:incoming>Flow_${generateId()}</bpmn:incoming>
      <bpmn:outgoing>Flow_${generateId()}</bpmn:outgoing>
      <bpmn:outgoing>Flow_${generateId()}</bpmn:outgoing>
    </bpmn:exclusiveGateway>`;
            break;
        }
      });
      
      // Add sequence flows based on the flow definitions
      lane.flows.forEach(flow => {
        const parts = flow.split('->').map(p => p.trim());
        for (let i = 0; i < parts.length - 1; i++) {
          const flowId = `Flow_${generateId()}`;
          bpmnXml += `
    <bpmn:sequenceFlow id="${flowId}" sourceRef="${parts[i]}" targetRef="${parts[i + 1]}" />`;
        }
      });
    });
    
    bpmnXml += `
  </bpmn:process>`;
  });
  
  // Add diagram visualization
  bpmnXml += `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_${generateId()}">
      <!-- Diagram visualization would be added here by the modeler -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  
  // Before returning the final XML
  console.log('Generated BPMN XML with pools:', pools.length);
  return bpmnXml;
};

/**
 * Validates if a string is a well-formed XML
 * @param xml XML string to validate
 * @returns true if XML is valid, false otherwise
 */
export const validateXML = (xml: string): boolean => {
  try {
    if (!xml || typeof xml !== 'string' || xml.trim() === '') {
      return false;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    // If parsing fails, a parsererror node is added
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      console.error('XML parse error:', errorNode.textContent);
      return false;
    }
    
    // Check for required BPMN elements
    const hasBpmnDefinitions = doc.querySelector('bpmn\\:definitions, definitions') !== null;
    if (!hasBpmnDefinitions) {
      console.error('XML validation: Missing bpmn:definitions element');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('XML validation error:', err);
    return false;
  }
};

/**
 * Generate a random ID for BPMN elements
 */
const generateId = (): string => {
  return `id_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Escape XML special characters
 */
const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

// Create an empty BPMN 2.0 diagram for fallback
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Empty" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Empty" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Example Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Empty">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="179" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="260" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="412" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="420" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="120" />
        <di:waypoint x="412" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`; 