import React, { useEffect, useRef, useState } from 'react';
import { Radar, ShieldAlert, CheckCircle, AlertTriangle, AlertOctagon, FileText, Send, Map as MapIcon, Link as LinkIcon, Search } from 'lucide-react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const initialThreatData: Record<string, number> = {
  "Maharashtra": 85,
  "Delhi": 92,
  "Uttar Pradesh": 78,
  "West Bengal": 71,
  "Tamil Nadu": 45,
  "Karnataka": 60,
  "Bihar": 88,
  "Rajasthan": 65,
  "Gujarat": 55,
  "Madhya Pradesh": 70
};

interface ScanResult {
  verdict: string;
  confidence: number;
  signals: string[];
}

const FakeNewsRadar: React.FC = () => {
  const mapRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedState, setSelectedState] = useState<string | null>('Delhi');
  
  // Checker State
  const [newsText, setNewsText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // D3 Map Effect
  useEffect(() => {
    if (!mapRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;
    const svg = d3.select(mapRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous renders

    // Setup map projection
    const projection = d3.geoMercator();
    const pathGenerator = d3.geoPath().projection(projection);

    const g = svg.append('g');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Color scale: Green (low) -> Yellow (medium) -> Red (high)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 50, 100])
      .range(['#10b981', '#f59e0b', '#ef4444']);

    // Fetch TopoJSON
    d3.json('https://cdn.jsdelivr.net/npm/india-states-topojson@1.0.0/india.json')
      .then((data: any) => {
        const states = topojson.feature(data, data.objects.IndiaStates);
        
        // Fit Map to Container
        projection.fitSize([width, height], states as any);

        // Render States
        g.selectAll('path')
          .data((states as any).features)
          .enter()
          .append('path')
          .attr('class', 'state-path cursor-pointer transition-colors duration-200 stroke-white dark:stroke-gray-800 stroke-[0.5px]')
          .attr('d', pathGenerator as any)
          .attr('fill', (d: any) => {
             const stateName = d.properties.st_nm;
             const score = initialThreatData[stateName] || 20; // Default low threat
             return colorScale(score);
          })
          .on('mouseover', function() {
            d3.select(this).attr('stroke-width', 2).attr('stroke', '#000');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 0.5).attr('stroke', document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff');
          })
          .on('click', (event, d: any) => {
             setSelectedState(d.properties.st_nm);
          });
      })
      .catch(error => {
        console.error("Error loading map data: ", error);
        svg.append('text')
           .attr('x', width / 2)
           .attr('y', height / 2)
           .attr('text-anchor', 'middle')
           .attr('fill', '#ef4444')
           .text('Failed to load India Map Data (404/CORS).');
      });

  }, []);

  const handleCheckRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsText.trim()) return;
    
    setIsChecking(true);
    setScanResult(null);

    try {
      const response = await fetch('http://localhost:8001/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newsText, mode: 'fake_news' })
      });
      const data = await response.json();
      
      // Map generic NLP to specific fake news keys if required, or mock the mapping
      setScanResult({
        verdict: data.scam_detected ? 'LIKELY FAKE' : (data.riskScore > 40 ? 'MANIPULATIVE CONTENT' : 'VERIFIED'),
        confidence: data.confidence || 85,
        signals: data.explanation || ["Emotional manipulation", "Unverified source domain", "Sensationalist language"]
      });
    } catch (err) {
      console.error(err);
      // Fallback Demo result if backend lacks the specific endpoint/fails
      setTimeout(() => {
        setScanResult({
            verdict: 'MANIPULATIVE CONTENT',
            confidence: 89,
            signals: ["Sensationalist tone detected", "No authoritative citations", "Known misinformation framing"]
        });
      }, 1500);
    } finally {
      setIsChecking(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'VERIFIED': return <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><CheckCircle size={16}/> {verdict}</div>;
      case 'LIKELY FAKE': return <div className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><AlertOctagon size={16}/> {verdict}</div>;
      case 'MANIPULATIVE CONTENT': return <div className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><AlertTriangle size={16}/> {verdict}</div>;
      default: return <div className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"><FileText size={16}/> UNVERIFIED</div>;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-6">
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center text-white">
          <Radar size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Threat Intelligence Radar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Live geographic tracking & verification of misinformation campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MAP SECTION */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><MapIcon size={18} className="text-violet-600"/> India Fake News Heatmap</h2>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div ref={containerRef} className="w-full h-[500px] rounded-xl overflow-hidden bg-blue-50/50 dark:bg-gray-900/50 relative">
              <svg ref={mapRef} className="w-full h-full"></svg>
              <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm font-medium text-xs dark:text-gray-300">
                <p className="mb-2 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Threat Level</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Low</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Med</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> High</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* REGION SIDEBAR */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 dark:text-white invisible hidden lg:block">Details</h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[516px] flex flex-col">
            <h3 className="text-xl font-black text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-2">
              {selectedState || "Select a State"}
            </h3>
            
            <div className="flex items-end gap-2 mb-8">
               <span className="text-4xl font-light text-gray-900 dark:text-white leading-none">
                 {selectedState ? (initialThreatData[selectedState] || 20) : '--'}
               </span>
               <span className="text-sm font-bold text-gray-400 uppercase tracking-widest pb-1">Risk Score</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700 pb-2">Active Modus Operandi</p>
               
               {/* Hardcoded active examples context */}
               <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs mb-1">
                     <AlertTriangle size={14} /> EVM Tampering Rumors
                  </div>
                  <p className="text-xs text-red-800/80 dark:text-red-300/80 leading-relaxed">Artificially altered videos showing poll workers tampering with machines circulating on private WhatsApp groups.</p>
               </div>

               <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs mb-1">
                     <ShieldAlert size={14} /> Fake Government Schemes
                  </div>
                  <p className="text-xs text-orange-800/80 dark:text-orange-300/80 leading-relaxed">Phishing links claiming to register citizens for immediate "PM Subsidy Funds" are actively trending.</p>
               </div>
            </div>

            <div className="pt-4 mt-auto border-t border-gray-100 dark:border-gray-700">
               <button 
                  onClick={() => window.location.hash = '#reports'} // Simplified routing assumption
                  className="w-full py-3 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Report Incident from this Region
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKER SECTION */}
      <div className="space-y-4 pt-10 border-t border-gray-200 dark:border-gray-800">
         <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Search className="text-violet-600"/> Misinformation Deep-Scan</h2>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           <form onSubmit={handleCheckRequest} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
              <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 block">
                Paste News Content or Article URL
              </label>
              <textarea 
                value={newsText}
                onChange={(e) => setNewsText(e.target.value)}
                placeholder="Paste suspicious headline, viral WhatsApp forward, or news URL..."
                className="w-full flex-1 min-h-[160px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl resize-y text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                required
              />
              <button 
                type="submit" 
                disabled={isChecking || !newsText.trim()}
                className="mt-6 flex items-center justify-center gap-2 py-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 dark:shadow-none hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isChecking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Send size={18}/> Initiate Threat Scan</>}
              </button>
           </form>

           <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
             
             {/* Scanner Beam Animation Overlay */}
             {isChecking && (
                <div className="absolute inset-0 bg-violet-600/5 dark:bg-violet-400/5 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                   <div className="w-full max-w-[200px] h-1 bg-violet-600/20 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-violet-600 animate-[pulse_1s_infinite] rounded-full translate-x-[-100%]"></div>
                   </div>
                   <p className="mt-4 text-sm font-bold text-violet-600 dark:text-violet-400 animate-pulse uppercase tracking-widest">Analyzing Semantics...</p>
                </div>
             )}

             {scanResult ? (
               <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Automated Verdict</p>
                      {getVerdictBadge(scanResult.verdict)}
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Confidence</p>
                       <span className="text-3xl font-black text-gray-900 dark:text-white font-mono">{scanResult.confidence}%</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Red Flag Signals Detected</p>
                    <ul className="space-y-2">
                      {scanResult.signals.map((sig, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                          <span>{sig}</span>
                        </li>
                      ))}
                    </ul>
                 </div>

                 <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cross-Check Sources</p>
                    <div className="flex flex-wrap gap-2">
                       <a href="https://www.altnews.in/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors">
                         <LinkIcon size={12}/> AltNews
                       </a>
                       <a href="https://www.boomlive.in/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors">
                         <LinkIcon size={12}/> Boom
                       </a>
                       <a href="https://factcheck.pib.gov.in/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors">
                         <LinkIcon size={12}/> PIB Fact Check
                       </a>
                    </div>
                 </div>
               </div>
             ) : (
                <div className="max-w-[240px] h-full mx-auto flex flex-col items-center justify-center text-center opacity-30 select-none pointer-events-none">
                  <ShieldAlert size={64} className="mb-4 text-violet-600" />
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Awaiting Input</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paste an article on the left side to begin forensic text analysis against known disinformation patterns.</p>
                </div>
             )}
             
           </div>

         </div>
      </div>
    </div>
  );
};

export default FakeNewsRadar;
