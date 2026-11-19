const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'OpeningExplorer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* ========================================================= */}\n      {/* 3-COLUMN MAIN INTERFACE';
const endMarker = '{/* ========================================================= */}\n      {/* "DÜNYADA KAÇ AÇILIŞ VAR?" MODAL';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

const replacement = `{/* ========================================================= */}
      {/* 2-COLUMN GRANDMASTER INTERFACE                             */}
      {/* Sol: Devasa Tahta (620px), Eval Bar, Toolbar, Master DB    */}
      {/* Sağ: Bütünleşik Strateji & Karar Merkezi (Tek Panel)       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* SOL: DEVASA TAHTA, EVAL BAR, TOOLBAR & BÜYÜKUSTA VERİTABANI */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col items-center gap-3">
          <div className="flex gap-3 w-full justify-center items-center">
            {/* Live Evaluation Bar */}
            <div className="h-[440px] sm:h-[540px] md:h-[600px]">
              <EvaluationBar evaluation={engineEvaluation} orientation={orientation} />
            </div>

            {/* Chessboard with Visible Edge Coordinates (1-8 & A-H) */}
            <div className="flex-1 max-w-[620px]">
              <Chessboard
                fen={chess.fen()}
                orientation={orientation}
                turnColor={chess.turn() === 'w' ? 'white' : 'black'}
                interactive={!botThinking && !chess.isGameOver() && isPlayerTurn}
                dests={getDests()}
                onMove={handleBoardMove}
                arrows={boardArrows}
                lastMove={lastMove}
                check={chess.inCheck()}
              />
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="w-full max-w-[620px] flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyMoves.length === 0 || botThinking}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                title="Hamleyi Geri Al"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                disabled={botThinking}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                title="Konumu Sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Tahtayı Çevir"
              >
                {orientation === 'white' ? '⚪' : '⚫'}
              </button>
            </div>

            {botThinking && (
              <span className="text-purple-400 font-bold animate-pulse text-xs flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Hoca düşünüyor...
              </span>
            )}

            <div className="text-slate-400 font-mono text-[11px] truncate max-w-[220px]" title={historyMoves.join(' ')}>
              {historyMoves.length > 0 ? historyMoves.join(' ') : 'Hamle bekliyor'}
            </div>
          </div>

          {/* Master Opening Database Stats Panel */}
          {masterStats && (
            <div className="w-full max-w-[620px] bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Büyükusta Veritabanı ({masterStats.totalGames.toLocaleString('tr-TR')} Oyun)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                  {masterStats.source === 'lichess-live' ? '⚡ Canlı Lichess' : '📚 Yerel Master DB'}
                </span>
              </div>

              {/* Master Win-Rate Ratio Bar */}
              <div className="space-y-1">
                <div className="h-4 w-full rounded-full overflow-hidden flex text-[10px] font-black font-mono shadow-inner">
                  <div
                    style={{ width: \`\${masterStats.totalGames > 0 ? (masterStats.whiteWins / masterStats.totalGames) * 100 : 38}%\` }}
                    className="bg-slate-200 text-slate-950 flex items-center justify-center transition-all"
                    title={\`Beyaz Kazancı: %\${masterStats.totalGames > 0 ? Math.round((masterStats.whiteWins / masterStats.totalGames) * 100) : 38}\`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.whiteWins / masterStats.totalGames) * 100) : 38}
                  </div>
                  <div
                    style={{ width: \`\${masterStats.totalGames > 0 ? (masterStats.draws / masterStats.totalGames) * 100 : 36}%\` }}
                    className="bg-slate-600 text-white flex items-center justify-center transition-all"
                    title={\`Beraberlik: %\${masterStats.totalGames > 0 ? Math.round((masterStats.draws / masterStats.totalGames) * 100) : 36}\`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.draws / masterStats.totalGames) * 100) : 36}
                  </div>
                  <div
                    style={{ width: \`\${masterStats.totalGames > 0 ? (masterStats.blackWins / masterStats.totalGames) * 100 : 26}%\` }}
                    className="bg-slate-950 text-slate-300 flex items-center justify-center border-l border-slate-800 transition-all"
                    title={\`Siyah Kazancı: %\${masterStats.totalGames > 0 ? Math.round((masterStats.blackWins / masterStats.totalGames) * 100) : 26}\`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.blackWins / masterStats.totalGames) * 100) : 26}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                  <span>⚪ Beyaz Kazancı</span>
                  <span>⚖️ Berabere</span>
                  <span>⚫ Siyah Kazancı</span>
                </div>
              </div>

              {/* Popular Master Moves in this Position */}
              {masterStats.moves && masterStats.moves.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-300 block">Bu Konumda En Çok Oynanan Usta Hamleleri:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {masterStats.moves.slice(0, 4).map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const moves = chess.moves({ verbose: true });
                          const found = moves.find(leg => leg.san === m.san);
                          if (found) {
                            makeMove(found.from, found.to, found.promotion);
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-xs group-hover:scale-105 transition-transform">
                            {m.san}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {m.total.toLocaleString('tr-TR')} oyun
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                          <span className="text-slate-200">%{m.whiteWinRate}</span>
                          <span>/</span>
                          <span className="text-slate-400">%{m.drawRate}</span>
                          <span>/</span>
                          <span className="text-slate-400">%{m.blackWinRate}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SAĞ: BÜTÜNLEŞİK BÜYÜKUSTA STRATEJİ & KARAR MERKEZİ         */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            {/* Header: Turn & Current Opening */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={\`w-3.5 h-3.5 rounded-full inline-block shadow-sm \${
                  chess.turn() === 'w' ? 'bg-slate-100 border border-slate-400' : 'bg-slate-950 border border-slate-600'
                }\`} />
                <span className="text-xs font-bold text-slate-200">
                  Sıra: <strong className={isPlayerTurn ? 'text-amber-400' : 'text-blue-400'}>
                    {chess.turn() === 'w' ? 'Beyaz' : 'Siyah'} {isPlayerTurn ? '(Senin Hamlen)' : '(Hoca Hamlesi)'}
                  </strong>
                </span>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400">
                {currentAnalysis.eco || 'A00'}
              </span>
            </div>

            {/* Current Opening Title */}
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{currentAnalysis.openingName || 'Başlangıç Konumu'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {currentAnalysis.title}
              </p>
            </div>

            {/* Coach Tip Box */}
            {currentAnalysis.coachTip && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hoca Tavsiyesi:</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed font-medium">
                  {currentAnalysis.coachTip}
                </p>
              </div>
            )}

            {/* Recommended Moves for Current Turn */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tavsiye Edilen Hamleler & Karar Ağacı:</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Tıklayarak oyna</span>
              </div>

              <div className="space-y-2">
                {currentAnalysis.candidateMoves.map((cand) => (
                  <button
                    key={cand.san}
                    onClick={() => makeMove(cand.from, cand.to)}
                    onMouseEnter={() => setHoveredCandidate(cand)}
                    onMouseLeave={() => setHoveredCandidate(null)}
                    className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm group-hover:scale-105 transition-transform">
                          {cand.san}
                        </span>
                        {cand.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-bold border border-slate-700">
                            {cand.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <Play className="w-3 h-3 fill-current" />
                        <span>Oyna</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{cand.why}</p>
                    <div className="text-[10px] text-indigo-400 font-medium mt-1 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 inline shrink-0" />
                      <span>{cand.leadsTo}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategic Intent Explanations */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-0.5">🎯 Neden Bu Hamle / Ne İşe Yarar?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">{currentAnalysis.whyThisMove}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-0.5">🛡️ Nereyi Koruyor & Tehdit Ediyor?</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <strong className="text-slate-300">Koruma:</strong> {currentAnalysis.whatItProtects} <br />
                  <strong className="text-amber-400/90">Tehdit:</strong> {currentAnalysis.whatItThreatens}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-0.5">🚀 Gelecek Planlar (Nereye Yürürüz?):</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">{currentAnalysis.futurePlan}</p>
              </div>
            </div>

            {/* Decision Tree History Branches */}
            {decisionPoints.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                  <span>Açılış Karar Noktaları (Geri Dön & Dene):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {decisionPoints.map((dp) => (
                    <button
                      key={dp.plyIndex}
                      onClick={() => setSelectedTreePly(dp.plyIndex)}
                      className={\`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors \${
                        (selectedTreePly === dp.plyIndex || (selectedTreePly === null && dp.plyIndex === activeDecisionPoint?.plyIndex))
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }\`}
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
\n      `;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully updated OpeningExplorer.tsx layout to 2-column Grandmaster design!');
