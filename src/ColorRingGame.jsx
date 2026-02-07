import { useRef, useEffect } from "react";

export default function ColorRingGame() {
    const canvasRef = useRef(null);

    const audioRef = useRef({ ctx: null, enabled: false });

    const game = useRef({
        rotation: 0,
        balls: [],
        gameOver: false,
        restartTimer: 0,
        redScore: 0,
        blueScore: 0,
        finalWinner: null
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        /* ================= AUDIO INIT ================= */
        function initAudio() {
            if (!audioRef.current.ctx) {
                audioRef.current.ctx =
                    new (window.AudioContext || window.webkitAudioContext)();
                audioRef.current.enabled = true;
            }
        }

        canvas.addEventListener("click", initAudio);
        canvas.addEventListener("touchstart", initAudio);

        /* ================= CANVAS ================= */
        const WIDTH = 500;
        const HEIGHT = 550;
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        const cx = WIDTH / 2;
        const cy = HEIGHT / 2 + 70;

        /* ================= RING ================= */
        const RADIUS = 200;
        const SEGMENTS = 12;
        const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS;
        const ROTATION_SPEED = 0.6;

        /* ================= PHYSICS ================= */
        const BALL_RADIUS = 6;
        const GRAVITY = 1200;
        const ROUND_LIMIT = 1000;
        const WIN_SCORE = 5;

        /* ================= TIMING ================= */
        const FIXED_DT = 1 / 60;
        let accumulator = 0;
        let lastTime = performance.now();

        /* ================= SOUND ================= */
        function playPopSound() {
            if (!audioRef.current.enabled) return;
            const ctx = audioRef.current.ctx;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "square";
            osc.frequency.value = 300;

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        }

        function playWinSound(isFinal) {
            if (!audioRef.current.enabled) return;
            const ctx = audioRef.current.ctx;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(isFinal ? 900 : 600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(
                isFinal ? 300 : 200,
                ctx.currentTime + 0.3
            );

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                ctx.currentTime + 0.3
            );

            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }

        /* ================= HELPERS ================= */
        function spawnBall(color) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 180 + Math.random() * 120;

            game.current.balls.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: BALL_RADIUS,
                color
            });

            playPopSound();
        }

        function resetRound() {
            game.current.rotation = 0;
            game.current.balls = [];
            spawnBall("#F52800");
            spawnBall("#0000F5");
            game.current.gameOver = false;
            game.current.restartTimer = 0;
        }

        resetRound();

        /* ================= UPDATE ================= */
        function update(dt) {
            if (game.current.finalWinner) return;

            if (game.current.gameOver) {
                game.current.restartTimer -= dt;
                if (game.current.restartTimer <= 0) resetRound();
                return;
            }

            game.current.rotation += ROTATION_SPEED * dt;

            for (const ball of game.current.balls) {
                ball.vy += GRAVITY * dt;
                ball.x += ball.vx * dt;
                ball.y += ball.vy * dt;

                const dx = ball.x - cx;
                const dy = ball.y - cy;
                const dist = Math.hypot(dx, dy);

                if (dist >= RADIUS - ball.r) {
                    const angle =
                        (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);

                    const segmentIndex = Math.floor(
                        ((angle - game.current.rotation + Math.PI * 2) %
                            (Math.PI * 2)) / SEGMENT_ANGLE
                    );

                    let segmentColor = "white";
                    if (segmentIndex < 6) {
                        segmentColor =
                            segmentIndex % 2 === 0 ? "#F52800" : "#0000F5";
                    }

                    const nx = dx / dist;
                    const ny = dy / dist;
                    const dot = ball.vx * nx + ball.vy * ny;

                    ball.x = cx + nx * (RADIUS - ball.r);
                    ball.y = cy + ny * (RADIUS - ball.r);

                    ball.vx -= 2 * dot * nx;
                    ball.vy -= 2 * dot * ny;

                    if (ball.color === segmentColor) {
                        spawnBall(ball.color);
                    }
                }
            }

            const redCount = game.current.balls.filter(b => b.color === "#F52800").length;
            const blueCount = game.current.balls.filter(b => b.color === "#0000F5").length;

            if (redCount >= ROUND_LIMIT || blueCount >= ROUND_LIMIT) {
                if (redCount >= ROUND_LIMIT) game.current.redScore++;
                if (blueCount >= ROUND_LIMIT) game.current.blueScore++;

                playWinSound(false);

                if (game.current.redScore >= WIN_SCORE) {
                    game.current.finalWinner = "RED";
                    playWinSound(true);
                } else if (game.current.blueScore >= WIN_SCORE) {
                    game.current.finalWinner = "BLUE";
                    playWinSound(true);
                } else {
                    game.current.gameOver = true;
                    game.current.restartTimer = 1.5;
                }
            }
        }

        /* ================= RENDER ================= */
        function drawScoreBalls(x, y, color, score) {
            const MAX = 5;
            const R = 10;
            const GAP = 24;

            for (let i = 0; i < MAX; i++) {
                ctx.beginPath();
                ctx.arc(x + i * GAP, y, R, 0, Math.PI * 2);

                if (i < score) {
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                } else {
                    ctx.fillStyle = "rgba(255,255,255,0.2)";
                    ctx.shadowBlur = 0;
                }

                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        function render() {
            ctx.clearRect(0, 0, WIDTH, HEIGHT);

            /* 🏷️ TITLE */
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 30px Arial";
            ctx.textAlign = "center";
            ctx.fillText(
                "Select your ball and see who wins",
                WIDTH / 2,
                30
            );

            /* 🔴🔵 SCORE */
            const scoreY = 70;
            drawScoreBalls(WIDTH / 2 - 120, scoreY, "#ef4444", game.current.redScore);
            drawScoreBalls(WIDTH / 2 + 20, scoreY, "#3b82f6", game.current.blueScore);

            /* 🔢 BALL COUNTS */
            const redCount = game.current.balls.filter(b => b.color === "#F52800").length;
            const blueCount = game.current.balls.filter(b => b.color === "#0000F5").length;

            ctx.font = "24px monospace";

            ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center";
            ctx.fillText(`Red: ${redCount}`, WIDTH / 2 - 90, scoreY + 40);

            ctx.fillStyle = "#3b82f6";
            ctx.fillText(`Blue: ${blueCount}`, WIDTH / 2 + 90, scoreY + 40);

            /* 🔄 RING */
            for (let i = 0; i < SEGMENTS; i++) {
                const start = game.current.rotation + i * SEGMENT_ANGLE;
                const end = start + SEGMENT_ANGLE;

                let color = "#ffffff";
                if (i < 6) color = i % 2 === 0 ? "#ef4444" : "#3b82f6";

                ctx.beginPath();
                ctx.arc(cx, cy, RADIUS, start, end);
                ctx.strokeStyle = color;
                ctx.lineWidth = 14;
                ctx.stroke();
            }

            /* ⚪ BALLS */
            for (const ball of game.current.balls) {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
                ctx.fillStyle = ball.color;
                ctx.fill();
            }

            /* 🏆 FINAL WINNER */
            if (game.current.finalWinner) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                ctx.fillStyle = "#fff";
                ctx.font = "28px Arial";
                ctx.textAlign = "center";
                ctx.fillText(
                    `${game.current.finalWinner} WON THE MATCH`,
                    cx,
                    cy
                );
            }
        }

        function loop(now) {
            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;
            accumulator += dt;

            while (accumulator >= FIXED_DT) {
                update(FIXED_DT);
                accumulator -= FIXED_DT;
            }

            render();
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);

        return () => {
            canvas.removeEventListener("click", initAudio);
            canvas.removeEventListener("touchstart", initAudio);
        };
    }, []);

    return <canvas ref={canvasRef} />;
}
