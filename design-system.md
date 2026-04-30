      <div class="rccb-admin-wrapper bg-[#f8fafc] font-['Inter',sans-serif] text-slate-900 antialiased p-4 md:p-8">
        <style>
          .fire-gradient { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); }
          .glass-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 1); }
        </style>
        <header class="max-w-7xl mx-auto mb-10 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 fire-gradient rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <span class="material-symbols-outlined text-white text-3xl">local_fire_department</span>
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-900">RCCB Admin</h1>
              <p class="text-xs font-semibold uppercase tracking-widest text-orange-600">Spirit & Fire</p>
            </div>
          </div>
          <nav class="flex items-center gap-2 bg-white p-1 rounded-full shadow-sm border border-slate-200">
            <button class="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium">Tableau de bord</button>
            <button class="px-5 py-2 rounded-full text-slate-500 text-sm font-medium">Liste des inscriptions</button>
            <button class="p-2 text-slate-400 hover:text-red-600" title="Déconnexion">
              <span class="material-symbols-outlined text-xl">logout</span>
            </button>
          </nav>
        </header>
        <main class="max-w-7xl mx-auto space-y-8">
          <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="glass-card p-6 rounded-2xl shadow-sm">
              <p class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Total inscrits</p>
              <h3 class="text-4xl font-bold text-slate-900">24</h3>
            </div>
            <div class="glass-card p-6 rounded-2xl shadow-sm">
              <p class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Hommes</p>
              <h3 class="text-4xl font-bold text-slate-900">10</h3>
            </div>
            <div class="glass-card p-6 rounded-2xl shadow-sm">
              <p class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Femmes</p>
              <h3 class="text-4xl font-bold text-slate-900">14</h3>
            </div>
          </section>
          <section class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <label class="flex flex-col gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Date de présence
                <input type="date" value="2026-04-30" class="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800">
              </label>
              <div class="flex items-center gap-3">
                <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                  <span class="material-symbols-outlined text-lg">download</span> Exporter CSV
                </button>
                <button class="fire-gradient flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg shadow-lg shadow-orange-100">
                  <span class="material-symbols-outlined text-lg">save</span> Sauvegarder les présences
                </button>
              </div>
            </div>
            <table class="w-full text-left border-collapse">
              <thead><tr class="bg-slate-50 border-b border-slate-200"><th class="px-6 py-4 text-xs uppercase text-slate-500">Sauvegardes des réunions</th><th class="px-6 py-4 text-xs uppercase text-slate-500">Inscrits</th><th class="px-6 py-4 text-xs uppercase text-slate-500">Date de sauvegarde</th><th class="px-6 py-4 text-right text-xs uppercase text-slate-500">Actions</th></tr></thead>
              <tbody><tr class="hover:bg-orange-50/30"><td class="px-6 py-4 font-semibold">Réunion du 30/04/2026</td><td class="px-6 py-4"><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">24 participants</span></td><td class="px-6 py-4 text-sm text-slate-500">30/04/2026 14:46</td><td class="px-6 py-4 text-right"><button class="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600"><span class="material-symbols-outlined text-lg">cloud_download</span>Télécharger</button></td></tr></tbody>
            </table>
          </section>
        </main>
      </div>
