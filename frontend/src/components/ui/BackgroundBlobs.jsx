// ═══════════════════════════════════════════
// 3D 유기적 배경 블롭 애니메이션
// CSS filter: blur + 키프레임으로 3D 느낌 구현
// ═══════════════════════════════════════════

const BLOBS = [
  {
    size: 420,
    color: 'rgba(74, 108, 247, 0.14)',
    top: '-8%',
    right: '-6%',
    animation: 'blob-float-1 20s ease-in-out infinite',
    blur: 80,
  },
  {
    size: 360,
    color: 'rgba(14, 165, 160, 0.12)',
    bottom: '-5%',
    left: '-4%',
    animation: 'blob-float-2 25s ease-in-out infinite',
    blur: 75,
  },
  {
    size: 300,
    color: 'rgba(245, 158, 11, 0.08)',
    top: '40%',
    right: '10%',
    animation: 'blob-float-3 18s ease-in-out infinite',
    blur: 70,
  },
  {
    size: 260,
    color: 'rgba(139, 92, 246, 0.10)',
    top: '5%',
    left: '8%',
    animation: 'blob-float-4 22s ease-in-out infinite',
    blur: 65,
  },
];

export default function BackgroundBlobs() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            background: blob.color,
            filter: `blur(${blob.blur}px)`,
            WebkitFilter: `blur(${blob.blur}px)`,
            animation: blob.animation,
            top: blob.top,
            right: blob.right,
            bottom: blob.bottom,
            left: blob.left,
            willChange: 'transform, border-radius',
          }}
        />
      ))}
    </div>
  );
}
