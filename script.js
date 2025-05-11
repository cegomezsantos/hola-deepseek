document.addEventListener('DOMContentLoaded', () => {

  // --- Intersection Observer for Animations ---
  const sectionsToAnimate = document.querySelectorAll('.animate-on-scroll');
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
  const observerCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  };
  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sectionsToAnimate.forEach(section => { observer.observe(section); });
  // --- End Intersection Observer ---


  // --- Saludo Personalizado ---
  const welcomeMessage = document.getElementById('welcomeMessage');
  const defaultWelcomeText = welcomeMessage ? welcomeMessage.textContent : "Sandbox de Prompts";
  try {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('naus');
    if (welcomeMessage && userName && userName.trim() !== '') {
      const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      welcomeMessage.textContent = `¡Hola, ${capitalizedUserName}!`;
      const subtitle = document.querySelector('.main-header .subtitle');
      if (subtitle) {
          subtitle.textContent = `Bienvenido/a al Sandbox Inteligente. ${subtitle.textContent}`;
      }
    } else if (welcomeMessage) {
        welcomeMessage.textContent = defaultWelcomeText;
    }
  } catch (e) {
    console.error("Error al procesar parámetros de URL:", e);
     if (welcomeMessage) welcomeMessage.textContent = defaultWelcomeText;
  }
  // --- Fin Saludo Personalizado ---

  // --- Paso 2: Resultado Desplegable ---
  const toggleOutputBtn = document.getElementById('toggleOutputBtn');
  const iaOutputContent = document.getElementById('iaOutputContent');
  if (toggleOutputBtn && iaOutputContent) {
    toggleOutputBtn.addEventListener('click', () => {
      const isVisible = iaOutputContent.classList.contains('visible');
      if (isVisible) {
        iaOutputContent.classList.remove('visible');
        toggleOutputBtn.textContent = 'Mostrar Resultado Ejemplo';
      } else {
        iaOutputContent.classList.add('visible');
        toggleOutputBtn.textContent = 'Ocultar Resultado Ejemplo';
      }
    });
  }

  // --- Helper: Show Feedback with Animation ---
  function showFeedback(element, message, type = 'bad', isLoading = false) {
      if (!element) return;
      // Ensure element exists and clear previous state quickly
      element.textContent = '';
      element.className = 'feedback animate-feedback'; // Reset classes
      // Add loader immediately if loading
       if (isLoading) {
           element.innerHTML = `<span class="loader"></span> ${message}`;
           element.classList.add('feedback--loading');
       }
      // Use a small delay to ensure transition runs
      setTimeout(() => {
          if (!isLoading) { // If not loading, set final message and type
              element.textContent = message; // Use textContent for safety
              element.classList.add(`feedback--${type}`);
          }
          element.classList.add('visible'); // Make it visible
      }, isLoading ? 0 : 10); // No delay for loading, small delay for final feedback
  }

   // --- Helper: Show/Hide Completion Message ---
    function showCompletionMessage(show = true) {
        const completionDiv = document.getElementById('completionMessage');
        if (!completionDiv) return;

        if (show) {
            // Use a delay to ensure the feedback appears first, then the completion message
            setTimeout(() => {
                completionDiv.style.display = 'block'; // Make it display block
                setTimeout(() => { completionDiv.classList.add('visible'); }, 10); // Add visible class after re-render
            }, 600); // Delay matches/exceeds feedback animation time
        } else {
            completionDiv.classList.remove('visible');
            // Wait for transition to finish before setting display to none
            completionDiv.addEventListener('transitionend', function handler() {
                if (!completionDiv.classList.contains('visible')) {
                     completionDiv.style.display = 'none';
                }
                 completionDiv.removeEventListener('transitionend', handler);
            });
             // Fallback in case transitionend doesn't fire (e.g., display was already none)
            if (!completionDiv.classList.contains('visible') && completionDiv.style.display !== 'none') {
                 setTimeout(() => { completionDiv.style.display = 'none'; }, 600);
            }
        }
    }

    // --- Helper: Show/Hide Prompt Destinations ---
    function showPromptDestinations(show = true) {
         const destinationsDiv = document.getElementById('promptDestinations');
         if (!destinationsDiv) return;

         if (show) {
            // Use a delay so this appears after feedback but possibly before completion message
            setTimeout(() => {
                 destinationsDiv.classList.add('visible'); // CSS transition handles max-height/opacity
            }, 400); // Slightly shorter delay than completion message
         } else {
             destinationsDiv.classList.remove('visible');
         }
    }


  // --- Paso 4: Calentamiento de prompts ---
  const analyzeBtn = document.getElementById('analyzeBtn');
  const retryBtn = document.getElementById('retryBtn');
  const feedback4 = document.getElementById('step4Feedback');
  const paso4 = document.getElementById('paso4');
  const warmupForm = document.getElementById('warmupForm');
  if (analyzeBtn && feedback4 && paso4 && warmupForm) {
    analyzeBtn.addEventListener('click', async () => {
        // Hide previous feedback immediately
        if (feedback4) feedback4.classList.remove('visible');
        if (retryBtn) retryBtn.style.display = 'none';

        const rol = warmupForm.querySelector('[name="rol"]')?.value.trim() || '';
        const objetivo = warmupForm.querySelector('[name="objetivo"]')?.value.trim() || '';
        const contexto = warmupForm.querySelector('[name="contexto"]')?.value.trim() || '';

        if (!rol || !objetivo || !contexto) {
            showFeedback(feedback4, 'Por favor, completa Rol, Objetivo y Contexto.', 'bad');
            paso4.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        showFeedback(feedback4, 'Analizando tu prompt...', '', true); // Show loading

        try {
            // **REAL API CALL (Step 4)**
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol, objetivo, contexto })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
                throw new Error(errorData.error || `Error HTTP ${res.status}`);
            }

            const data = await res.json(); // Expected: { suggestions, score, ok }

            let feedbackType = 'bad';
            // Usamos 'ok' como principal indicador, luego 'score'
            if (data.ok === true) {
                feedbackType = 'good';
            } else if (data.score !== undefined && data.score >= 50) {
                 feedbackType = 'okay';
            }

            // Mostrar sugerencias (puede ser HTML o texto plano)
             if (feedback4) {
                 // Clear loader and update with final feedback
                 showFeedback(feedback4, data.suggestions || 'Análisis completado.', feedbackType);
             }

            if (feedbackType !== 'good' && retryBtn) {
                // Use a slight delay for retry button to appear after feedback animation
                setTimeout(() => { retryBtn.style.display = 'inline-block'; }, 500);
            }

        } catch (err) {
            console.error("Error en Paso 4:", err);
            showFeedback(feedback4, `Error al analizar: ${err.message}. Intenta de nuevo.`, 'bad');
             if (retryBtn) {
                setTimeout(() => { retryBtn.style.display = 'inline-block'; }, 500);
             }
        }
        // Scroll to feedback area after animation starts
         setTimeout(() => { feedback4.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    });
  }
  if (retryBtn && feedback4 && paso4 && warmupForm) {
    retryBtn.addEventListener('click', () => {
      feedback4.classList.remove('visible'); // Hide feedback immediately
      feedback4.textContent = ''; // Clear content
      feedback4.className = 'feedback animate-feedback'; // Reset classes
      retryBtn.style.display = 'none';
      warmupForm.reset();
      paso4.querySelector('input[name="rol"]')?.focus();
    });
  }

  // --- Paso 5: Evaluación semáforo, Destinos y Finalización ---
  const evaluateBtn = document.getElementById('evaluatePrompt');
  const challengeFeedback = document.getElementById('challengeFeedback');
  const trafficLights = document.querySelectorAll('#trafficLight .light');
  const studentPromptText = document.getElementById('studentPrompt');
  const paso5 = document.getElementById('paso5');
  const completionMessageDiv = document.getElementById('completionMessage');
  const promptDestinationsDiv = document.getElementById('promptDestinations'); // Get the new div
  const copyPromptBtn = document.getElementById('copyPromptBtn'); // Get the copy button


  function setTrafficLight(level) { // level: 'red', 'yellow', 'green' or null to turn off
      trafficLights.forEach(light => {
          light.classList.remove('active');
          if (level && light.classList.contains(level)) {
              light.classList.add('active');
          }
      });
  }

  // Add copy functionality
  if (copyPromptBtn && studentPromptText) {
      copyPromptBtn.addEventListener('click', async () => {
          const textToCopy = studentPromptText.value.trim();
          if (textToCopy) {
              try {
                  await navigator.clipboard.writeText(textToCopy);
                  // Provide visual feedback
                  const originalText = copyPromptBtn.textContent;
                  copyPromptBtn.textContent = '¡Copiado!';
                  copyPromptBtn.classList.add('success');
                  setTimeout(() => {
                      copyPromptBtn.textContent = originalText;
                       copyPromptBtn.classList.remove('success');
                  }, 2000); // Revert after 2 seconds
              } catch (err) {
                  console.error('Error al copiar prompt:', err);
                  // Optionally show a temporary error message
                  const originalText = copyPromptBtn.textContent;
                  copyPromptBtn.textContent = 'Error al copiar';
                   copyPromptBtn.classList.add('feedback--bad'); // Use a feedback class for temp styling
                  setTimeout(() => {
                       copyPromptBtn.textContent = originalText;
                        copyPromptBtn.classList.remove('feedback--bad');
                  }, 2000);
              }
          }
      });
  }


  if (evaluateBtn && challengeFeedback && trafficLights.length > 0 && studentPromptText && paso5 && completionMessageDiv && promptDestinationsDiv) {
    evaluateBtn.addEventListener('click', async () => {
        const studentPrompt = studentPromptText.value.trim();

        // Hide previous results immediately
        setTrafficLight(null);
        showCompletionMessage(false);
        showPromptDestinations(false);
        if (challengeFeedback) challengeFeedback.classList.remove('visible'); // Hide feedback immediately


        if (!studentPrompt) {
            showFeedback(challengeFeedback, 'Escribe tu prompt antes de evaluar.', 'bad');
            setTrafficLight('red');
            // Scroll to feedback area after animation starts
            setTimeout(() => { challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
            return;
        }

        showFeedback(challengeFeedback, 'Evaluando tu prompt...', '', true); // Show loading

        try {
            // **REAL API CALL (Step 5)**
            const res = await fetch('/api/evaluate', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ prompt: studentPrompt })
             });

             if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }));
                throw new Error(errorData.error || `Error HTTP ${res.status}`);
            }

            const info = await res.json(); // Expected: { level, feedback }

            // Validar el nivel recibido del backend
            const validLevels = ['red', 'yellow', 'green'];
            const level = validLevels.includes(info.level) ? info.level : 'red'; // Default a 'red' if not valid

             // Mapear level ('red', 'yellow', 'green') to feedback type ('bad', 'okay', 'good')
            let feedbackType = 'bad';
            if (level === 'green') feedbackType = 'good';
            else if (level === 'yellow') feedbackType = 'okay';

            // Set traffic light immediately
            setTrafficLight(level);

            // Show feedback after traffic light updates
            showFeedback(challengeFeedback, info.feedback || 'Evaluación completada.', feedbackType);

            // If successful (okay or good), show destinations and completion message
            if (level === 'yellow' || level === 'green') {
                 showPromptDestinations(true); // Will animate in after a delay
                 showCompletionMessage(true); // Will animate in after a delay
                 // Scroll to the destinations/completion message area after their animation starts
                 setTimeout(() => {
                     // Scroll to destinations div as it's the first new element
                     promptDestinationsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }, 700); // Delay matches/exceeds animation delays
            } else {
                 showPromptDestinations(false);
                 showCompletionMessage(false);
                 // Scroll to feedback area for 'red' results
                  setTimeout(() => { challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
            }


        } catch (e) {
            console.error("Error en Paso 5:", e);
            showFeedback(challengeFeedback, `Error al evaluar: ${e.message}. Intenta más tarde.`, 'bad');
            setTrafficLight('red');
            showPromptDestinations(false);
            showCompletionMessage(false);
             // Scroll to feedback area on error
             setTimeout(() => { challengeFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        }
    });
  }

});