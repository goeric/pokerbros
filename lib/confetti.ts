// Simple confetti implementation without external dependencies
export function triggerConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    createConfetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    createConfetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

function createConfetti(options: any) {
  // Simple DOM-based confetti
  const { particleCount, origin } = options;

  for (let i = 0; i < particleCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = getRandomColor();
    confetti.style.left = `${origin.x * 100}%`;
    confetti.style.top = `${origin.y * 100}%`;
    confetti.style.opacity = '1';
    confetti.style.zIndex = '1000';
    confetti.style.pointerEvents = 'none';

    document.body.appendChild(confetti);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 5 + Math.random() * 10;
    const gravity = 0.3;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity - 10;
    let x = parseFloat(confetti.style.left);
    let y = parseFloat(confetti.style.top);
    let opacity = 1;

    const animate = () => {
      vy += gravity;
      x += vx;
      y += vy;
      opacity -= 0.01;

      confetti.style.left = x + '%';
      confetti.style.top = y + '%';
      confetti.style.opacity = opacity.toString();

      if (opacity > 0 && y < 100) {
        requestAnimationFrame(animate);
      } else {
        confetti.remove();
      }
    };

    requestAnimationFrame(animate);
  }
}

function getRandomColor() {
  const colors = ['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}
