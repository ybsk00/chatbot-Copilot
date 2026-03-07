// ═══════════════════════════════════════════
// 3D 글래스모피즘 배경 — 추상적 3D 오브젝트 + 앰비언트 블롭
// ═══════════════════════════════════════════

export default function BackgroundBlobs() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* ── 메쉬 그라디언트 배경 (민트 + 라벤더) ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 20% 40%, rgba(14,165,160,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 70% 50% at 80% 20%, rgba(167,139,250,0.05) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 50% 80%, rgba(6,182,212,0.04) 0%, transparent 50%),
          linear-gradient(160deg, #F2FAFA 0%, #F8FAFC 30%, #F3EFFA 60%, #F8FAFC 100%)
        `,
      }} />

      {/* ── 3D Sphere: 큰 틸 구체 (우상단) ── */}
      <div style={{
        position: 'absolute',
        top: '3%',
        right: '6%',
        width: 260,
        height: 260,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.85) 0%, rgba(14,165,160,0.28) 30%, rgba(6,182,212,0.12) 60%, rgba(14,165,160,0.02) 100%)',
        boxShadow: '0 40px 80px -20px rgba(14,165,160,0.18), inset 0 -20px 60px rgba(14,165,160,0.08)',
        animation: 'float-3d-1 20s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── 3D Sphere: 중간 라벤더 구체 (좌하단) ── */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        left: '3%',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.75) 0%, rgba(167,139,250,0.22) 35%, rgba(139,92,246,0.08) 65%, transparent 100%)',
        boxShadow: '0 30px 60px -15px rgba(139,92,246,0.12), inset 0 -15px 40px rgba(139,92,246,0.06)',
        animation: 'float-3d-2 25s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── 3D Sphere: 작은 시안 구체 (중앙 우측) ── */}
      <div style={{
        position: 'absolute',
        top: '52%',
        right: '18%',
        width: 110,
        height: 110,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9) 0%, rgba(6,182,212,0.32) 40%, rgba(6,182,212,0.06) 75%, transparent 100%)',
        boxShadow: '0 20px 45px -10px rgba(6,182,212,0.14)',
        animation: 'float-3d-3 18s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── 3D Sphere: 미니 틸 구체 (좌상단) ── */}
      <div style={{
        position: 'absolute',
        top: '14%',
        left: '22%',
        width: 70,
        height: 70,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.9) 0%, rgba(14,165,160,0.28) 50%, transparent 100%)',
        boxShadow: '0 12px 28px rgba(14,165,160,0.1)',
        animation: 'float-3d-4 16s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── Glass Panel: 회전된 유리 패널 ── */}
      <div style={{
        position: 'absolute',
        top: '28%',
        left: '10%',
        width: 120,
        height: 120,
        borderRadius: 28,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.3)',
        animation: 'float-glass 22s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── Glass Panel: 작은 유리 큐브 (우하단) ── */}
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '8%',
        width: 80,
        height: 80,
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
        animation: 'float-glass-2 19s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── Torus Ring: 틸 링 ── */}
      <div style={{
        position: 'absolute',
        top: '16%',
        left: '52%',
        width: 140,
        height: 140,
        borderRadius: '50%',
        border: '18px solid rgba(14,165,160,0.07)',
        background: 'transparent',
        boxShadow: '0 8px 25px rgba(14,165,160,0.05), inset 0 2px 8px rgba(14,165,160,0.03)',
        animation: 'float-ring 26s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── Torus Ring: 라벤더 링 (우하) ── */}
      <div style={{
        position: 'absolute',
        bottom: '18%',
        right: '30%',
        width: 90,
        height: 90,
        borderRadius: '50%',
        border: '12px solid rgba(167,139,250,0.06)',
        background: 'transparent',
        boxShadow: '0 6px 18px rgba(139,92,246,0.04)',
        animation: 'float-ring-2 20s ease-in-out infinite',
        willChange: 'transform',
      }} />

      {/* ── 앰비언트 블롭 (소프트 배경) ── */}
      <div style={{
        position: 'absolute',
        top: '-8%',
        right: '-3%',
        width: 500,
        height: 500,
        background: 'rgba(14, 165, 160, 0.04)',
        filter: 'blur(100px)',
        WebkitFilter: 'blur(100px)',
        animation: 'blob-float-1 28s ease-in-out infinite',
        willChange: 'transform, border-radius',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-5%',
        left: '-3%',
        width: 420,
        height: 420,
        background: 'rgba(167, 139, 250, 0.03)',
        filter: 'blur(90px)',
        WebkitFilter: 'blur(90px)',
        animation: 'blob-float-2 32s ease-in-out infinite',
        willChange: 'transform, border-radius',
      }} />
      <div style={{
        position: 'absolute',
        top: '35%',
        left: '25%',
        width: 350,
        height: 350,
        background: 'rgba(6, 182, 212, 0.03)',
        filter: 'blur(85px)',
        WebkitFilter: 'blur(85px)',
        animation: 'blob-float-3 24s ease-in-out infinite',
        willChange: 'transform, border-radius',
      }} />
    </div>
  );
}
