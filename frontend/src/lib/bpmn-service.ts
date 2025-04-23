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
  
  try {
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
        flows: Array<{
          sourceRef: string;
          targetRef: string;
          condition?: string;
        }>;
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
        
        // Gateway: <Gateway?> as gateway_id
        if (trimmed.includes('<') && trimmed.includes('>')) {
          const match = trimmed.match(/<(.*?)>\s+as\s+(\w+)/);
          if (match) {
            currentLane.elements.push({
              type: 'gateway',
              id: match[2],
              name: match[1]
            });
          }
          continue;
        }
        
        // Flow: a -> b: Condition
        if (trimmed.includes('->')) {
          // Handle sequence flows with conditions
          if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            const flowPath = parts[0].trim();
            const condition = parts[1].trim();
            
            const pathParts = flowPath.split('->').map(p => p.trim());
            if (pathParts.length >= 2) {
              currentLane.flows.push({
                sourceRef: pathParts[0],
                targetRef: pathParts[1],
                condition: condition
              });
            }
          } else {
            // Standard flows without conditions
            const pathParts = trimmed.split('->').map(p => p.trim());
            for (let i = 0; i < pathParts.length - 1; i++) {
              currentLane.flows.push({
                sourceRef: pathParts[i],
                targetRef: pathParts[i + 1]
              });
            }
          }
        }
      }
    }

    // Ensure we have at least one pool
    if (pools.length === 0) {
      console.error('No pools found in PiperFlow text');
      return EMPTY_DIAGRAM;
    }
    
    // Build the BPMN XML
    // Include xsi namespace for the condition expressions
    let bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_${generateId()}"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="BPMN Editor"
  exporterVersion="1.0">`;
    
    // Create a fixed collaboration ID
    const collaborationId = `Collaboration_${generateId()}`;
    
    bpmnXml += `
  <bpmn:collaboration id="${collaborationId}">
    <bpmn:documentation>${title}</bpmn:documentation>`;
    
    // Add each pool with a unique ID
    const poolIds: Record<string, string> = {};
    const processIds: Record<string, string> = {};
    
    pools.forEach((pool) => {
      const poolId = `Pool_${generateId()}`;
      const processId = `Process_${generateId()}`;
      poolIds[pool.name] = poolId;
      processIds[pool.name] = processId;
      
      bpmnXml += `
    <bpmn:participant id="${poolId}" name="${escapeXml(pool.name)}" processRef="${processId}" />`;
    });
    
    bpmnXml += `
  </bpmn:collaboration>`;
    
    // Add process for each pool
    const elementIds: Record<string, string> = {};
    const flowIds: Record<string, string> = {};
    
    pools.forEach((pool) => {
      const processId = processIds[pool.name];
      
      bpmnXml += `
  <bpmn:process id="${processId}" isExecutable="false">`;
      
      // Process-level lanes
      pool.lanes.forEach((lane) => {
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
        
        // Create unique outgoing IDs for each element
        const outgoingFlows: Record<string, string[]> = {};
        const incomingFlows: Record<string, string[]> = {};
        
        // First pass: collect all flow connections
        lane.flows.forEach(flow => {
          const flowId = `Flow_${generateId()}`;
          flowIds[`${flow.sourceRef}->${flow.targetRef}`] = flowId;
          
          if (!outgoingFlows[flow.sourceRef]) outgoingFlows[flow.sourceRef] = [];
          outgoingFlows[flow.sourceRef].push(flowId);
          
          if (!incomingFlows[flow.targetRef]) incomingFlows[flow.targetRef] = [];
          incomingFlows[flow.targetRef].push(flowId);
        });
        
        // Add elements with proper connections
        lane.elements.forEach(element => {
          const elemOutgoing = outgoingFlows[element.id] || [];
          const elemIncoming = incomingFlows[element.id] || [];
          
          // Store element IDs for diagram positioning later
          elementIds[element.id] = element.id;
          
          switch (element.type) {
            case 'start':
              bpmnXml += `
    <bpmn:startEvent id="${element.id}" name="Start">`;
              elemOutgoing.forEach(flowId => {
                bpmnXml += `
      <bpmn:outgoing>${flowId}</bpmn:outgoing>`;
              });
              bpmnXml += `
    </bpmn:startEvent>`;
              break;
              
            case 'end':
              bpmnXml += `
    <bpmn:endEvent id="${element.id}" name="End">`;
              elemIncoming.forEach(flowId => {
                bpmnXml += `
      <bpmn:incoming>${flowId}</bpmn:incoming>`;
              });
              bpmnXml += `
    </bpmn:endEvent>`;
              break;
              
            case 'task':
              bpmnXml += `
    <bpmn:task id="${element.id}" name="${escapeXml(element.name || '')}">`;
              elemIncoming.forEach(flowId => {
                bpmnXml += `
      <bpmn:incoming>${flowId}</bpmn:incoming>`;
              });
              elemOutgoing.forEach(flowId => {
                bpmnXml += `
      <bpmn:outgoing>${flowId}</bpmn:outgoing>`;
              });
              bpmnXml += `
    </bpmn:task>`;
              break;
              
            case 'gateway':
              bpmnXml += `
    <bpmn:exclusiveGateway id="${element.id}" name="${escapeXml(element.name || '')}">`;
              elemIncoming.forEach(flowId => {
                bpmnXml += `
      <bpmn:incoming>${flowId}</bpmn:incoming>`;
              });
              elemOutgoing.forEach(flowId => {
                bpmnXml += `
      <bpmn:outgoing>${flowId}</bpmn:outgoing>`;
              });
              bpmnXml += `
    </bpmn:exclusiveGateway>`;
              break;
          }
        });
        
        // Add sequence flows with correct refs
        lane.flows.forEach(flow => {
          const flowId = flowIds[`${flow.sourceRef}->${flow.targetRef}`];
          bpmnXml += `
    <bpmn:sequenceFlow id="${flowId}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"`;
          
          // Add condition if present
          if (flow.condition) {
            bpmnXml += `>
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.condition)}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>`;
          } else {
            bpmnXml += ` />`;
          }
        });
      });
      
      bpmnXml += `
  </bpmn:process>`;
    });
    
    // Generate diagram visualization with positions
    bpmnXml += `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${collaborationId}">`;
    
    // Add pool shapes with coordinates
    let poolY = 0;
    const POOL_HEIGHT = 300;
    const LANE_HEIGHT = 200;
    const POOL_WIDTH = 800;
    
    // Add pools
    pools.forEach((pool, poolIndex) => {
      const poolId = poolIds[pool.name];
      const poolTop = poolIndex * (POOL_HEIGHT + 50); // Add spacing between pools
      
      bpmnXml += `
      <bpmndi:BPMNShape id="${poolId}_di" bpmnElement="${poolId}" isHorizontal="true">
        <dc:Bounds x="160" y="${poolTop}" width="${POOL_WIDTH}" height="${POOL_HEIGHT}" />
      </bpmndi:BPMNShape>`;
      
      // Add lanes
      let laneY = poolTop;
      pool.lanes.forEach((lane, laneIndex) => {
        const laneId = `Lane_${laneIndex}_${generateId()}`;
        const laneHeight = POOL_HEIGHT / pool.lanes.length;
        
        bpmnXml += `
      <bpmndi:BPMNShape id="${laneId}_di" bpmnElement="${laneId}" isHorizontal="true">
        <dc:Bounds x="190" y="${laneY}" width="${POOL_WIDTH - 30}" height="${laneHeight}" />
      </bpmndi:BPMNShape>`;
        
        // Add elements with positions
        const ELEMENT_SPACING = 180; // Increased spacing
        const START_X = 250;
        const MIDDLE_Y = laneY + laneHeight / 2;
        
        // Arrange elements horizontally
        let elementsByLevel: Record<number, Array<{id: string, type: string, level: number}>> = {};
        
        // Calculate levels for horizontal positioning
        const elementLevels: Record<string, number> = {};
        
        // Find start events or elements without incoming flows as level 0
        const startElements = lane.elements.filter(e => 
          e.type === 'start' || 
          !lane.flows.some(f => f.targetRef === e.id)
        );
        
        // Initialize all elements with levels
        startElements.forEach(elem => {
          elementLevels[elem.id] = 0;
          if (!elementsByLevel[0]) elementsByLevel[0] = [];
          elementsByLevel[0].push({id: elem.id, type: elem.type, level: 0});
        });
        
        // Assign levels based on flow depth
        const assignLevels = (startElementId: string) => {
          const visited = new Set<string>();
          const queue: {id: string, level: number}[] = [{id: startElementId, level: 0}];
          
          while (queue.length > 0) {
            const {id, level} = queue.shift()!;
            
            if (visited.has(id)) continue;
            visited.add(id);
            
            elementLevels[id] = level;
            if (!elementsByLevel[level]) elementsByLevel[level] = [];
            
            const element = lane.elements.find(e => e.id === id);
            if (element && !elementsByLevel[level].some(e => e.id === id)) {
              elementsByLevel[level].push({id, type: element.type, level});
            }
            
            // Find all outgoing flows
            const outgoingFlows = lane.flows.filter(f => f.sourceRef === id);
            outgoingFlows.forEach(flow => {
              queue.push({id: flow.targetRef, level: level + 1});
            });
          }
        };
        
        // Process all start elements
        startElements.forEach(elem => {
          assignLevels(elem.id);
        });
        
        // Ensure all elements have a level
        lane.elements.forEach(elem => {
          if (elementLevels[elem.id] === undefined) {
            // Find any connected elements
            const incomingFlow = lane.flows.find(f => f.targetRef === elem.id);
            if (incomingFlow && elementLevels[incomingFlow.sourceRef] !== undefined) {
              const level = elementLevels[incomingFlow.sourceRef] + 1;
              elementLevels[elem.id] = level;
              if (!elementsByLevel[level]) elementsByLevel[level] = [];
              elementsByLevel[level].push({id: elem.id, type: elem.type, level});
            } else {
              // Default to level 0 if no connections
              const level = 0;
              elementLevels[elem.id] = level;
              if (!elementsByLevel[level]) elementsByLevel[level] = [];
              elementsByLevel[level].push({id: elem.id, type: elem.type, level});
            }
          }
        });
        
        const maxLevel = Math.max(...Object.values(elementLevels), 0);
        
        // Position elements based on levels
        const elementPositions: Record<string, {x: number, y: number, height: number, width: number}> = {};
        
        for (let level = 0; level <= maxLevel; level++) {
          const elements = elementsByLevel[level] || [];
          const x = START_X + level * ELEMENT_SPACING;
          
          // Distribute elements in this level vertically
          const elemCount = elements.length;
          if (elemCount > 0) {
            // Use 60% of lane height and center vertically
            const totalHeight = laneHeight * 0.6;
            const elemSpacing = totalHeight / (elemCount + 1);
            const startY = laneY + laneHeight * 0.2; // Start at 20% of lane height
            
            elements.forEach((elem, idx) => {
              const y = startY + (idx + 1) * elemSpacing;
              
              let width = 100;
              let height = 80;
              
              // Adjust dimensions based on element type
              if (elem.type === 'start' || elem.type === 'end') {
                width = 36;
                height = 36;
              } else if (elem.type === 'gateway') {
                width = 50;
                height = 50;
              }
              
              elementPositions[elem.id] = {
                x,
                y: y - height/2, // Center vertically
                width,
                height
              };
            });
          }
        }
        
        // Add shapes for each element
        lane.elements.forEach(element => {
          const pos = elementPositions[element.id] || 
                     { x: START_X, y: MIDDLE_Y - 40, width: 100, height: 80 };
          
          let shapeDef = '';
          
          switch (element.type) {
            case 'start':
              shapeDef = `
      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${pos.x}" y="${pos.y}" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${pos.x}" y="${pos.y + 36 + 5}" width="36" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;
              break;
              
            case 'end':
              shapeDef = `
      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${pos.x}" y="${pos.y}" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${pos.x}" y="${pos.y + 36 + 5}" width="36" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;
              break;
              
            case 'task':
              shapeDef = `
      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${pos.x}" y="${pos.y}" width="100" height="80" />
      </bpmndi:BPMNShape>`;
              break;
              
            case 'gateway':
              shapeDef = `
      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${pos.x}" y="${pos.y}" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${pos.x - 15}" y="${pos.y - 20}" width="80" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;
              break;
          }
          
          bpmnXml += shapeDef;
        });
        
        // Add edges for flows with proper routing
        lane.flows.forEach(flow => {
          const flowId = flowIds[`${flow.sourceRef}->${flow.targetRef}`];
          const sourcePos = elementPositions[flow.sourceRef];
          const targetPos = elementPositions[flow.targetRef];
          
          if (sourcePos && targetPos) {
            // Calculate connection points
            let sourceX = sourcePos.x + sourcePos.width;
            let sourceY = sourcePos.y + sourcePos.height/2;
            
            let targetX = targetPos.x;
            let targetY = targetPos.y + targetPos.height/2;
            
            // Create a path with waypoints
            bpmnXml += `
      <bpmndi:BPMNEdge id="${flowId}_di" bpmnElement="${flowId}">
        <di:waypoint x="${sourceX}" y="${sourceY}" />`;
            
            // Add intermediate waypoint if there's significant vertical distance
            if (Math.abs(sourceY - targetY) > 30) {
              const midX = (sourceX + targetX) / 2;
              bpmnXml += `
        <di:waypoint x="${midX}" y="${sourceY}" />
        <di:waypoint x="${midX}" y="${targetY}" />`;
            }
            
            bpmnXml += `
        <di:waypoint x="${targetX}" y="${targetY}" />`;
              
            // Add label for conditions
            if (flow.condition) {
              const labelX = (sourceX + targetX) / 2;
              const labelY = (sourceY + targetY) / 2 - 15;
              
              bpmnXml += `
        <bpmndi:BPMNLabel>
          <dc:Bounds x="${labelX - 40}" y="${labelY}" width="80" height="14" />
        </bpmndi:BPMNLabel>`;
            }
            
            bpmnXml += `
      </bpmndi:BPMNEdge>`;
          }
        });
        
        laneY += laneHeight;
      });
    });
    
    bpmnXml += `
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    
    console.log('Generated BPMN XML with pools:', pools.length);
    return bpmnXml;
  } catch (error) {
    console.error('Error generating BPMN XML:', error);
    return EMPTY_DIAGRAM;
  }
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
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Empty" targetNamespace="http://bpmn.io/schema/bpmn">
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