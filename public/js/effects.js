// Particles.js configuration
document.addEventListener('DOMContentLoaded', () => {
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-container', {
      particles: {
        number: {
          value: 80,
          density: {
            enable: true,
            value_area: 800
          }
        },
        color: {
          value: '#5aff15'
        },
        shape: {
          type: 'circle',
          stroke: {
            width: 0,
            color: '#000000'
          },
          polygon: {
            nb_sides: 5
          }
        },
        opacity: {
          value: 0.5,
          random: true,
          anim: {
            enable: true,
            speed: 1,
            opacity_min: 0.1,
            sync: false
          }
        },
        size: {
          value: 3,
          random: true,
          anim: {
            enable: true,
            speed: 2,
            size_min: 0.1,
            sync: false
          }
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#5aff15',
          opacity: 0.4,
          width: 1
        },
        move: {
          enable: true,
          speed: 1,
          direction: 'none',
          random: true,
          straight: false,
          out_mode: 'out',
          bounce: false,
          attract: {
            enable: false,
            rotateX: 600,
            rotateY: 1200
          }
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: {
            enable: true,
            mode: 'grab'
          },
          onclick: {
            enable: true,
            mode: 'push'
          },
          resize: true
        },
        modes: {
          grab: {
            distance: 140,
            line_linked: {
              opacity: 1
            }
          },
          bubble: {
            distance: 400,
            size: 40,
            duration: 2,
            opacity: 8,
            speed: 3
          },
          repulse: {
            distance: 200,
            duration: 0.4
          },
          push: {
            particles_nb: 4
          },
          remove: {
            particles_nb: 2
          }
        }
      },
      retina_detect: true
    });
  }

  // Toxic liquid animation
  const toxicLiquid = document.getElementById('toxic-liquid');
  
  if (toxicLiquid) {
    // Create bubbles
    for (let i = 0; i < 15; i++) {
      createBubble(toxicLiquid);
    }
  }
});

// Create a toxic bubble
function createBubble(container) {
  const bubble = document.createElement('div');
  bubble.className = 'toxic-bubble';
  
  // Random positioning
  const left = Math.random() * 100;
  const size = Math.random() * 30 + 10;
  const animationDuration = Math.random() * 10 + 10;
  
  bubble.style.cssText = `
    position: absolute;
    left: ${left}%;
    bottom: -${size}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(90, 255, 21, 0.2);
    box-shadow: 0 0 10px rgba(90, 255, 21, 0.5);
    animation: bubble-rise ${animationDuration}s linear infinite;
    opacity: 0.7;
  `;
  
  container.appendChild(bubble);
}

// Add bubble rise animation to stylesheet
const bubbleStyle = document.createElement('style');
bubbleStyle.innerHTML = `
  @keyframes bubble-rise {
    0% {
      bottom: -30px;
      opacity: 0.1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      bottom: 100%;
      opacity: 0;
    }
  }
`;
document.head.appendChild(bubbleStyle); 