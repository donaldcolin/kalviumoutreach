import { useState } from 'react';
import { type User } from '../../stores/authStore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export interface OrgNode {
  user: User;
  children: OrgNode[];
}

interface OrgChartProps {
  data: OrgNode[];
}

export function OrgChart({ data }: OrgChartProps) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No hierarchy data available.</div>;
  }

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-gray-50/30">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={4}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <button 
                onClick={() => zoomIn()}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => zoomOut()}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => resetTransform()}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title="Reset View"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
            
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
              <div className="org-tree p-16 min-w-max min-h-max flex items-center justify-center cursor-grab active:cursor-grabbing">
                <ul>
                  {data.map((node) => (
                    <OrgChartNodeComponent key={node.user.id} node={node} />
                  ))}
                </ul>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'headOfSales': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'regionalManager': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'teamLead': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'executive': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'headOfSales': return 'Head of Sales';
    case 'admin': return 'Admin';
    case 'regionalManager': return 'AGM';
    case 'teamLead': return 'Manager';
    case 'executive': return 'Associate';
    default: return role;
  }
};

function OrgChartNodeComponent({ node }: { node: OrgNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li>
      <div className="inline-block relative z-10 transition-transform duration-200 hover:-translate-y-1">
        <div 
          className={`w-48 bg-white border border-gray-200 shadow-sm rounded-lg p-2.5 flex items-center gap-3 relative hover:shadow-md transition-shadow ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={() => { if (hasChildren) setIsCollapsed(!isCollapsed); }}
        >
          <div className={`absolute top-0 left-0 w-full h-1 rounded-t-lg ${getRoleColor(node.user.role).split(' ')[0]}`} />
          
          <Avatar className="w-9 h-9 border border-gray-100 shrink-0">
            <AvatarFallback className={`${getRoleColor(node.user.role).split(' ')[0]} ${getRoleColor(node.user.role).split(' ')[1]} font-bold text-xs`}>
              {node.user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col text-left min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-xs truncate leading-tight" title={node.user.name}>
              {node.user.name}
            </h3>
            <p className="text-[10px] font-semibold text-gray-500 truncate leading-tight mt-0.5">
              {getRoleLabel(node.user.role)}
            </p>
            <p className="text-[9px] text-gray-400 truncate leading-tight mt-0.5 uppercase tracking-wider">
              {node.user.regionId === 'global' ? 'Global' : node.user.regionId}
            </p>
          </div>
          
          {hasChildren && (
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm z-20">
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </div>
          )}
        </div>
      </div>
      
      {hasChildren && !isCollapsed && (
        <ul>
          {node.children.map((childNode) => (
            <OrgChartNodeComponent key={childNode.user.id} node={childNode} />
          ))}
        </ul>
      )}
    </li>
  );
}
