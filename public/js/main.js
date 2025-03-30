document.addEventListener('DOMContentLoaded', () => {
  // Handle logout
  const logoutLink = document.querySelector('a[href="/logout"]');
  
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        const res = await fetch('/api/auth/logout', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await res.json();
        
        if (data.success) {
          // Redirect to home page
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }
  
  // Add glitch effect to glitch-text elements
  const glitchTexts = document.querySelectorAll('.glitch-text');
  
  glitchTexts.forEach(text => {
    // Create data-text attribute for CSS glitch effect
    text.setAttribute('data-text', text.textContent);
    
    // Add random glitch animation
    setInterval(() => {
      if (Math.random() > 0.95) {
        text.classList.add('glitch-active');
        setTimeout(() => {
          text.classList.remove('glitch-active');
        }, 200);
      }
    }, 1000);
  });
}); 