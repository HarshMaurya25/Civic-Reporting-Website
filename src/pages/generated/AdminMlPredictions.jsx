import React from 'react';

export default function AdminMlPredictions() {
  return (
    <>



{/*  Prediction Dashboard Content  */}
<div className="pt-24 px-8 pb-12 w-full max-w-7xl mx-auto flex flex-col gap-8">
{/*  Page Header/Introduction  */}
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div className="max-w-2xl">
<span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">Predictive Governance Dashboard</span>
<h2 className="text-4xl font-black font-headline text-on-primary-fixed leading-tight tracking-tighter">Citizen Insights &amp; <span className="text-primary">Resource Forecasting.</span></h2>
<p className="text-on-surface-variant mt-4 text-lg leading-relaxed">Leveraging historical civic data and real-time environmental sensors to anticipate urban needs before they escalate.</p>
</div>
<div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl shadow-sm">
<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
<span className="material-symbols-outlined text-primary" data-icon="auto_awesome">auto_awesome</span>
</div>
<div>
<p className="text-xs font-bold text-on-surface-variant">AI Confidence</p>
<p className="text-2xl font-black text-primary">94.2%</p>
</div>
</div>
</div>
{/*  Prediction Cards Grid  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/*  Card 1: Worker Need  */}
<div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border-t-4 border-primary-container relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-container/5 rounded-full"></div>
<div className="flex justify-between items-start mb-6 relative z-10">
<div className="p-3 bg-primary-container/10 rounded-xl">
<span className="material-symbols-outlined text-primary-container" data-icon="engineering">engineering</span>
</div>
<span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Demand Spike Likely</span>
</div>
<h3 className="text-xl font-bold font-headline mb-2">Worker Need Prediction</h3>
<p className="text-sm text-on-surface-variant mb-6">Anticipated shortfall in Zone 4 sanitation personnel for the upcoming weekend festival cycle.</p>
<div className="mt-auto grid grid-cols-2 gap-4">
<div className="bg-surface-container-low p-3 rounded-lg">
<p className="text-[10px] uppercase font-bold text-outline">Current Staff</p>
<p className="text-lg font-black">142</p>
</div>
<div className="bg-primary-container p-3 rounded-lg text-white">
<p className="text-[10px] uppercase font-bold opacity-80">Predicted Need</p>
<p className="text-lg font-black">185</p>
</div>
</div>
</div>
{/*  Card 2: Flood Risk  */}
<div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border-t-4 border-secondary-container relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary-container/5 rounded-full"></div>
<div className="flex justify-between items-start mb-6 relative z-10">
<div className="p-3 bg-secondary-container/10 rounded-xl">
<span className="material-symbols-outlined text-secondary-container" data-icon="flood">flood</span>
</div>
<span className="bg-error/5 text-error text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">High Alert</span>
</div>
<h3 className="text-xl font-bold font-headline mb-2">Flood Risk Analysis</h3>
<p className="text-sm text-on-surface-variant mb-6">River embankment sensors indicate a 78% probability of low-level flooding in North Basin within 72 hours.</p>
<div className="flex items-center gap-2 mt-auto">
<div className="flex-1 h-3 bg-surface-container-high rounded-full overflow-hidden">
<div className="h-full bg-secondary-container w-[78%]"></div>
</div>
<span className="text-sm font-black text-secondary-container">78%</span>
</div>
</div>
{/*  Card 3: Accident Hotspots  */}
<div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border-t-4 border-tertiary-container relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 bg-tertiary-container/5 rounded-full"></div>
<div className="flex justify-between items-start mb-6 relative z-10">
<div className="p-3 bg-tertiary-container/10 rounded-xl">
<span className="material-symbols-outlined text-tertiary-container" data-icon="minor_crash">minor_crash</span>
</div>
<span className="bg-tertiary-container/5 text-tertiary-container text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Spatial Forecast</span>
</div>
<h3 className="text-xl font-bold font-headline mb-2">Accident Hotspots</h3>
<p className="text-sm text-on-surface-variant mb-6">Intersection 45-B and Sector 7 Expressway showing increased risk patterns due to visibility drops.</p>
<div className="mt-auto flex gap-4">
<div className="flex -space-x-3 overflow-hidden">
<img className="inline-block h-8 w-8 rounded-full ring-2 ring-white" data-alt="portrait of a middle-aged male city planning expert in professional attire" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9HLuIG5UVm9N7VShLzdIz2Ts7hGkF8cVzjocVJu6hlNJVTm_bex3uZnJ8U8ZYt34cxPHeqZveeJAXU7VzZFUaVzxJewgoxmo0RHyKUDvMWQGdxhqLuO2Ug7ULMftg3lx5lsmGpuUJ0gkz0g652RVih3K6Ij0yJ-P1u0Sdy1ftyeGi0T_RXRyncuhnoMggAUDFwRKNTflBlgUTVGjt7Lm9fiohvmn3eiFYrA_p5o_uYfi8QgwIfYFV40y0R1q7fV3PKgaz-wkdNrf6"/>
<img className="inline-block h-8 w-8 rounded-full ring-2 ring-white" data-alt="portrait of a young female data scientist with glasses in a modern office environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjJUeD4iJM1UCVKsmsv-yAnHxzauYgQS848mPHK_DsD_emCr22ZrHoVW5FBLtL8REcYmw5IGncHT6Q61t6-g6LCOiKI7EUMZrXQ1z5a_N-CGyrn9gTks0kdzmdtK3GjdRE-OSf8CErKba0_I3agSgFa1wkQ-d08lrsN6cP_EaMx3xHFmKJFHJVXhhsiAYI4onj0RFtFwOx7jKJOdq-WzsXMss7X9Col-juf7AA7Hj7PQZAg3GqOjhMM4fhNG0ueUcw5r5PUgSDltKH"/>
<div className="h-8 w-8 rounded-full bg-surface-container-highest ring-2 ring-white flex items-center justify-center text-[10px] font-bold">+3</div>
</div>
<p className="text-[10px] text-on-surface-variant flex items-center font-medium italic">Safety units pre-assigned to area</p>
</div>
</div>
{/*  Card 4: Issue Surge Alerts  */}
<div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col border-t-4 border-primary relative overflow-hidden">
<div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full"></div>
<div className="flex justify-between items-start mb-6 relative z-10">
<div className="p-3 bg-primary/10 rounded-xl">
<span className="material-symbols-outlined text-primary" data-icon="speed">speed</span>
</div>
<span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Predictive Trend</span>
</div>
<h3 className="text-xl font-bold font-headline mb-2">Issue Surge Alerts</h3>
<p className="text-sm text-on-surface-variant mb-6">Neural net detects emerging pattern of 'Streetlight Failures' in South Ridge. Cluster detection active.</p>
<div className="mt-auto flex items-baseline gap-2">
<span className="text-3xl font-black text-primary">↑ 12%</span>
<span className="text-xs font-bold text-on-surface-variant">vs. Last Week</span>
</div>
</div>
</div>
{/*  Forecasted Complaint Volume Chart Area  */}
<div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm relative overflow-hidden">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
<div>
<h3 className="text-2xl font-black font-headline">Forecasted Complaint Volume</h3>
<p className="text-sm text-on-surface-variant">Predicted volume of citizen tickets for the next 30 days based on seasonal trends.</p>
</div>
<div className="flex items-center gap-4">
<div className="flex items-center gap-2">
<span className="w-3 h-3 bg-primary rounded-full"></span>
<span className="text-xs font-bold text-on-surface-variant">Actual</span>
</div>
<div className="flex items-center gap-2">
<span className="w-3 h-0.5 border-t-2 border-dashed border-primary-container"></span>
<span className="text-xs font-bold text-on-surface-variant">Forecast</span>
</div>
</div>
</div>
{/*  Simulated Area Chart  */}
<div className="h-64 w-full relative mt-4">
{/*  Grid Lines  */}
<div className="absolute inset-0 flex flex-col justify-between opacity-10">
<div className="h-px bg-on-surface w-full"></div>
<div className="h-px bg-on-surface w-full"></div>
<div className="h-px bg-on-surface w-full"></div>
<div className="h-px bg-on-surface w-full"></div>
</div>
{/*  Chart Path (Simplified Placeholder)  */}
<svg className="w-full h-full preserve-3d" preserveaspectratio="none" viewBox="0 0 1000 200">
{/*  Actual Data Fill  */}
<path d="M0 180 L 100 160 L 200 170 L 300 140 L 400 150 L 500 100 L 600 120 V 200 H 0 Z" fill="url(#grad1)" fill-opacity="0.2"></path>
<path d="M0 180 L 100 160 L 200 170 L 300 140 L 400 150 L 500 100 L 600 120" fill="none" stroke="#00288e" strokeWidth="3"></path>
{/*  Forecast Dash  */}
<path d="M600 120 L 700 90 L 800 110 L 900 60 L 1000 70" fill="none" stroke="#1e40af" stroke-dasharray="8 6" strokeWidth="3"></path>
<defs>
<lineargradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" style={{stopColor: '#00288e', stopOpacity: '1'}}></stop>
<stop offset="100%" style={{stopColor: '#00288e', stopOpacity: '0'}}></stop>
</lineargradient>
</defs>
</svg>
{/*  Tooltip Marker  */}
<div className="absolute top-[85px] left-[50%] -translate-x-1/2 flex flex-col items-center">
<div className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg mb-1">Today</div>
<div className="w-4 h-4 bg-white border-2 border-primary rounded-full"></div>
</div>
</div>
{/*  X-Axis Labels  */}
<div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-outline uppercase tracking-wider">
<span>May 01</span>
<span>May 08</span>
<span>May 15</span>
<span className="text-primary">Today (May 22)</span>
<span>May 29</span>
<span>Jun 05</span>
<span>Jun 12</span>
</div>
</div>
{/*  Bento Bottom Action Grid  */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="md:col-span-2 bg-primary-container p-8 rounded-xl text-white flex justify-between items-center relative overflow-hidden">
<div className="relative z-10">
<h4 className="text-2xl font-black font-headline mb-2">Automate Resource Dispatch</h4>
<p className="opacity-80 text-sm max-w-md">Enable AI-driven autonomous ticket routing and crew pre-staging based on current predictions.</p>
<button className="mt-6 bg-white text-primary font-bold px-6 py-2.5 rounded-xl hover:bg-surface transition-all">Launch AI Supervisor</button>
</div>
<span className="material-symbols-outlined text-[120px] opacity-10 absolute -right-4 top-1/2 -translate-y-1/2" data-icon="smart_toy">smart_toy</span>
</div>
<div className="bg-surface-container-high p-8 rounded-xl flex flex-col justify-center items-center text-center">
<span className="material-symbols-outlined text-4xl text-primary mb-4" data-icon="file_download">file_download</span>
<h4 className="font-bold mb-1">Export ML Model</h4>
<p className="text-xs text-on-surface-variant mb-4">Download .JSON training data</p>
<button className="text-primary font-bold text-sm border-b-2 border-primary/20 hover:border-primary transition-all pb-1">Get Data Package</button>
</div>
</div>
</div>

{/*  FAB for quick action (Suppressed on analytics but kept for context as per task)  */}
{/*  Suppressed on this page per shell logic for "focused/analytics" but including if needed for global context. The logic says suppress on Settings/Details. We'll leave it out for this high-density view.  */}

    </>
  );
}
