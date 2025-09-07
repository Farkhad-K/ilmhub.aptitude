function playConfetti() {
    // const audio = document.getElementById('confettiSound');
    // audio.play();

    // Fire multiple bursts of confetti
    const duration = 1000;
    const animationEnd = Date.now() + duration;

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    (function frame() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) return;

        // Launch confetti from both sides and the middle
        const confettiLeft = confetti.create(null, { resize: true, useWorker: true });
        const confettiRight = confetti.create(null, { resize: true, useWorker: true });
        const confettiCenter = confetti.create(null, { resize: true, useWorker: true });

        confettiLeft({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 }
        });

        confettiRight({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 }
        });

        confettiCenter({
            particleCount: 4,
            angle: 90,
            spread: 100,
            origin: { x: 0.5, y: 0.5 }
        });

        requestAnimationFrame(frame);
    }());

    // Fire a final burst after a short delay
    setTimeout(() => {
        confetti({
            particleCount: 300,
            spread: 160,
            origin: { y: 0.6 }
        });
    }, duration - 500);
}