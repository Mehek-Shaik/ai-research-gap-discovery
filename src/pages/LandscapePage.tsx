import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Filter,
  ExternalLink,
  BookOpen,
  AlertCircle,
  Database,
  Cpu,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client.ts';
import { LandscapeGraphData, LandscapeNode, LandscapeLink } from '../types/index.ts';

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  paper: { bg: '#1e293b', border: '#334155', text: '#ffffff', dot: '#38bdf8' },
  domain: { bg: '#0369a1', border: '#0284c7', text: '#ffffff', dot: '#7dd3fc' },
  method: { bg: '#0f766e', border: '#14b8a6', text: '#ffffff', dot: '#2dd4bf' },
  dataset: { bg: '#b45309', border: '#f59e0b', text: '#ffffff', dot: '#fcd34d' },
  limitation: { bg: '#be123c', border: '#f43f5e', text: '#ffffff', dot: '#fda4af' },
  gap: { bg: '#6d28d9', border: '#8b5cf6', text: '#ffffff', dot: '#c4b5fd' }
};

export const LandscapePage: React.FC = () => {
  const [data, setData] = useState<LandscapeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<LandscapeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter toggles
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    paper: true,
    domain: true,
    method: true,
    dataset: true,
    limitation: true,
    gap: true
  });

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchLandscape();
  }, []);

  const fetchLandscape = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLandscapeData();
      setData(res);
      if (res.nodes.length > 0) {
        setSelectedNode(res.nodes[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate research landscape');
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Compute 2D Positions deterministically for visualization
  const getComputedPositions = () => {
    if (!data) return new Map<string, { x: number; y: number }>();
    const positions = new Map<string, { x: number; y: number }>();

    const paperNodes = data.nodes.filter(n => n.type === 'paper');
    const domainNodes = data.nodes.filter(n => n.type === 'domain');
    const methodNodes = data.nodes.filter(n => n.type === 'method');
    const datasetNodes = data.nodes.filter(n => n.type === 'dataset');
    const limitationNodes = data.nodes.filter(n => n.type === 'limitation');
    const gapNodes = data.nodes.filter(n => n.type === 'gap');

    // Central Papers Cluster
    paperNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, paperNodes.length)) * Math.PI * 2;
      const radius = 160;
      positions.set(node.id, {
        x: 450 + Math.cos(angle) * radius,
        y: 350 + Math.sin(angle) * radius
      });
    });

    // Top: Domains
    domainNodes.forEach((node, i) => {
      const step = 800 / Math.max(1, domainNodes.length + 1);
      positions.set(node.id, {
        x: 150 + step * (i + 1),
        y: 80
      });
    });

    // Right: Methods & Datasets
    methodNodes.forEach((node, i) => {
      const step = 450 / Math.max(1, methodNodes.length);
      positions.set(node.id, {
        x: 750 + (i % 2) * 50,
        y: 180 + i * step
      });
    });

    datasetNodes.forEach((node, i) => {
      const step = 450 / Math.max(1, datasetNodes.length);
      positions.set(node.id, {
        x: 830 + (i % 2) * 40,
        y: 220 + i * step
      });
    });

    // Bottom: Limitations & Candidate Gaps
    limitationNodes.forEach((node, i) => {
      const step = 700 / Math.max(1, limitationNodes.length);
      positions.set(node.id, {
        x: 120 + i * step,
        y: 560
      });
    });

    gapNodes.forEach((node, i) => {
      const step = 600 / Math.max(1, gapNodes.length);
      positions.set(node.id, {
        x: 200 + i * step,
        y: 650
      });
    });

    return positions;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium">Constructing multi-dimensional research landscape...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-base font-semibold">Unable to load landscape graph</h2>
        </div>
        <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>
        <button onClick={fetchLandscape} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <Compass className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Research Landscape Empty</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Upload and analyze research papers to generate your interactive knowledge graph mapping papers, algorithms, datasets, limitations, and candidate gaps.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Upload Papers to Build Landscape
        </Link>
      </div>
    );
  }

  const positions = getComputedPositions();
  const filteredNodes = data.nodes.filter(
    n => visibleTypes[n.type] && (!searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const visibleNodeIdSet = new Set(filteredNodes.map(n => n.id));

  const filteredLinks = data.links.filter(
    l => visibleNodeIdSet.has(l.source) && visibleNodeIdSet.has(l.target)
  );

  return (
    <div className="space-y-6">
      {/* Page Header & Stats */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Research Topic & Entity Landscape
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interactive knowledge graph connecting indexed papers, algorithmic methods, benchmarks, reported limitations, and candidate gaps.
          </p>
        </div>

        {/* Real Grounded Statistics Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-300">
          <span>{data.stats.totalPapers} Papers</span>
          <span aria-hidden="true">·</span>
          <span>{data.stats.totalMethods} Methods</span>
          <span aria-hidden="true">·</span>
          <span>{data.stats.totalDatasets} Datasets</span>
          <span aria-hidden="true">·</span>
          <span>{data.stats.totalLimitations} Limitations</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {data.stats.totalGaps} Candidate Gaps
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes in landscape..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:bg-slate-800 dark:focus:text-white dark:focus:ring-2 dark:focus:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Filter Checkboxes */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
          {(['paper', 'domain', 'method', 'dataset', 'limitation', 'gap'] as const).map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`rounded-md px-2.5 py-1 transition-colors capitalize ${
                visibleTypes[type]
                  ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white border border-slate-300 dark:border-slate-700'
                  : 'text-slate-400 hover:text-slate-600 line-through'
              }`}
            >
              {type}s
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.15))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={resetView}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Interactive Graph Canvas */}
        <div
          className="lg:col-span-3 relative h-[650px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle Coordinate Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          <svg
            className="w-full h-full"
            viewBox="0 0 1000 750"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '500px 375px',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* Links / Edges */}
            <g className="links opacity-50">
              {filteredLinks.map((link, idx) => {
                const sPos = positions.get(link.source);
                const tPos = positions.get(link.target);
                if (!sPos || !tPos) return null;

                const isConnected =
                  hoveredNode === link.source ||
                  hoveredNode === link.target ||
                  selectedNode?.id === link.source ||
                  selectedNode?.id === link.target;

                return (
                  <line
                    key={idx}
                    x1={sPos.x}
                    y1={sPos.y}
                    x2={tPos.x}
                    y2={tPos.y}
                    stroke={isConnected ? '#818cf8' : '#475569'}
                    strokeWidth={isConnected ? 2.5 : 1}
                    strokeDasharray={link.relation === 'reports_limitation' ? '3 3' : 'none'}
                    className="transition-colors duration-200"
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {filteredNodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode === node.id;
                const style = NODE_COLORS[node.type] || NODE_COLORS.paper;
                const radius = node.type === 'paper' ? 24 : node.type === 'gap' ? 18 : 12;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer transition-transform duration-150"
                  >
                    {/* Focus ring */}
                    {(isSelected || isHovered) && (
                      <circle
                        r={radius + 6}
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2"
                        opacity={0.8}
                      />
                    )}

                    {/* Node Shape */}
                    {node.type === 'gap' ? (
                      <rect
                        x={-14}
                        y={-14}
                        width={28}
                        height={28}
                        transform="rotate(45)"
                        fill={style.bg}
                        stroke={style.border}
                        strokeWidth={2}
                      />
                    ) : (
                      <circle
                        r={radius}
                        fill={style.bg}
                        stroke={style.border}
                        strokeWidth={2}
                      />
                    )}

                    {/* Center Dot Indicator */}
                    <circle r={3} fill={style.dot} />

                    {/* Node Text Label */}
                    <text
                      y={radius + 14}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight={node.type === 'paper' || node.type === 'gap' ? '600' : '400'}
                      className="pointer-events-none select-none font-sans drop-shadow-sm"
                    >
                      {node.label.length > 22 ? node.label.slice(0, 22) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Quick HUD legend in bottom left */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-900/80 px-3 py-1.5 backdrop-blur-xs border border-slate-800 text-[10px] text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>Paper</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span>Method</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Dataset</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span>Limitation</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rotate-45 bg-purple-400" />
              <span>Gap</span>
            </span>
          </div>
        </div>

        {/* Right Node Inspector Drawer */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {selectedNode.type} Entity Inspector
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedNode.label}
                </h3>
              </div>

              {selectedNode.details && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Full Description / Excerpt
                  </span>
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 leading-relaxed font-serif italic">
                    "{selectedNode.details}"
                  </p>
                </div>
              )}

              {selectedNode.category && (
                <div className="text-xs">
                  <span className="text-slate-400">Domain / Category: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedNode.category}
                  </span>
                </div>
              )}

              {selectedNode.severity && (
                <div className="text-xs">
                  <span className="text-slate-400">Severity / Priority: </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedNode.severity}
                  </span>
                </div>
              )}

              {/* Connected Edges */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Connected Relationships
                </span>
                <div className="space-y-1 text-xs">
                  {data.links
                    .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                    .slice(0, 5)
                    .map((l, i) => {
                      const otherId = l.source === selectedNode.id ? l.target : l.source;
                      const otherNode = data.nodes.find(n => n.id === otherId);
                      return (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px]">
                          <span className="text-slate-500 font-mono truncate max-w-[120px]">
                            {l.relation.replace('_', ' ')}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                            {otherNode?.label || otherId}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Deep Link to Library or Gaps Page */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {selectedNode.paperId && (
                  <Link
                    to={`/analyze?paperId=${selectedNode.paperId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Open Paper Deep Analysis</span>
                  </Link>
                )}
                {selectedNode.type === 'gap' && (
                  <Link
                    to="/gaps"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Inspect Gap Evidence in Depth</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-400 italic">
              Click any node in the landscape to inspect metadata, parent publications, and relationships.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
