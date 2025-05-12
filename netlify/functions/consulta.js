// consulta.js – Backend Node.js para Deepseek (Usando Chat Completions)

// --- IMPORTACIONES (CommonJS) ---
const express = require('express');
const axios = require('axios');
const serverless = require('serverless-http');

// --- CONFIGURACIÓN ---
const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY;
// ¡NUEVO ENDPOINT!
const DEEPSEEK_CHAT_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// Modelo de Deepseek a usar (elige el adecuado, ej: deepseek-chat, deepseek-coder)
const DEEPSEEK_MODEL = 'deepseek-chat'; // <-- AJUSTA SI ES NECESARIO

if (!DEEPSEEK_KEY) {
  console.error("¡ERROR CRÍTICO! DEEPSEEK_KEY no definida.");
}

// --- APLICACIÓN EXPRESS ---
const app = express();
app.use(express.json());

// --- ROUTER ---
const router = express.Router();

// --- RUTA: /analyze (Paso 4: Evaluación Estructural vía Chat) ---
// Esta ruta NO ha sido modificada respecto a tu versión anterior
router.post('/analyze', async (req, res) => {
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    const { rol, objetivo, contexto } = req.body;
    if (!rol || !objetivo || !contexto) return res.status(400).json({ error: 'Faltan campos.' });

    const userPromptToAnalyze = `Rol: ${rol}\nObjetivo: ${objetivo}\nContexto: ${contexto}`;

    // **NUEVO: Prompt para el modelo de CHAT**
    const systemMessage = `
    Eres un tutor experto en **Prompt Design Pedagógico**. Tu objetivo es ayudar a un estudiante a construir prompts efectivos y originales para tareas educativas, evaluando la **estructura (Rol, Objetivo, Contexto)** que ha definido.

    **Tarea Específica del Estudiante (Contexto Implícito):** El estudiante debe definir un Rol, Objetivo y Contexto para que una IA genere una **actividad de clase sobre redes sociales y estudiantes**.

    **Instrucciones Detalladas para tu Evaluación:**

    1.  **Originalidad y Esfuerzo:**
        *   **Penalización por Copia:** Compara el 'Objetivo' proporcionado por el estudiante con la tarea específica mencionada arriba ("crear una actividad en clase sobre las redes sociales y los estudiantes"). Si el objetivo es una copia casi idéntica o muy superficial de esta tarea, **asigna un score bajo (ej. < 40)** y en las \`suggestions\` indica claramente que debe **reformular el objetivo con sus propias palabras**, añadiendo detalles específicos sobre *qué tipo* de actividad quiere, para *qué nivel* de estudiantes, o *qué aspecto* de las redes sociales abordar. **No aceptes la simple repetición de la tarea.**
        *   **Fomenta la Especificidad:** Incluso si no es una copia directa, valora positivamente (mayor score) cuando el estudiante añade detalles únicos al Rol, Objetivo o Contexto que van más allá del enunciado básico.

    2.  **Análisis Estructural (Rol, Objetivo, Contexto):**
        *   **Rol:** ¿Define un actor claro para la IA (profesor, diseñador instruccional, experto en redes sociales, etc.)? ¿Es relevante para crear una actividad de clase? Un rol genérico es aceptable, pero uno específico es mejor.
        *   **Objetivo:** Aparte de la originalidad, ¿Describe *qué* se debe generar (un debate, una lista de preguntas, un caso de estudio, un proyecto, etc.)? ¿Menciona el *formato* o *extensión*? ¿Define el *propósito* de la actividad?
        *   **Contexto:** ¿Aporta detalles cruciales? (Ej: nivel educativo (secundaria, universidad), asignatura, tiempo disponible para la actividad, enfoque específico (privacidad, fake news, bienestar), herramientas disponibles, restricciones). ¿Ayuda a la IA a entender *cómo* debe ser la actividad?

    3.  **Calidad del Feedback (Suggestions):**
        *   **Constructivo y Accionable:** El feedback debe ser siempre útil. En lugar de solo decir "mal", explica *por qué* y *cómo* mejorar.
        *   **Enfocado en lo Próximo:** Si hay varios puntos débiles, céntrate en la mejora más importante o la más fácil de implementar para el estudiante.
        *   **Tono Didáctico:** Usa un lenguaje claro, alentador y orientado al aprendizaje. Evita jerga técnica innecesaria.
        *   **Ejemplos (Opcional Breve):** Si es relevante, puedes incluir un micro-ejemplo en las sugerencias, ej: "Intenta un objetivo como: 'Diseña una actividad de debate de 30 min para 10mo grado sobre los pros y contras del uso de Instagram'".

    **Formato de Salida Obligatorio (JSON Estricto):**
    Responde **únicamente** con un objeto JSON válido, sin texto adicional. El objeto debe tener las siguientes claves:
    *   \`"score"\`: Número entero 0-100. Penaliza fuertemente la copia del enunciado (<40). Valora la especificidad y coherencia.
    *   \`"ok"\`: Booleano. \`true\` si score >= 50, \`false\` si score < 50.
    *   \`"suggestions"\`: String en español (máx. 3 frases). Debe ser accionable y didáctico. Si el score es bajo por copia, debe indicarlo claramente. Si es alto (>85), puede ser un elogio con una sugerencia menor opcional.

    **Ejemplo Salida (Caso Copia):**
    \\\`\\\`\\\`json
    {
      "score": 35,
      "ok": false,
      "suggestions": "Parece que copiaste el enunciado de la tarea. Reformula el objetivo con tus propias palabras, especificando qué tipo de actividad quieres (debate, proyecto, etc.) y para qué nivel."
    }
    \\\`\\\`\\\`

     **Ejemplo Salida (Bueno pero Mejorable):**
    \\\`\\\`\\\`json
    {
      "score": 70,
      "ok": true,
      "suggestions": "Buena estructura base. Para mejorar, define más el 'Rol' (¿eres tú el profesor?) y añade detalles en 'Contexto' como el tiempo disponible o el curso específico."
    }
    \\\`\\\`\\\`

    Ahora, evalúa el prompt del usuario (Rol, Objetivo, Contexto) basado en estas instrucciones detalladas. Recuerda penalizar la copia del objetivo general de la tarea
    `; // Fin systemMessage
    // ..
    // ..
    // ..
    const userMessage = `
    Evalúa la estructura de este prompt (Rol, Objetivo, Contexto):
    ---
    ${userPromptToAnalyze}
    ---
    Genera el objeto JSON de evaluación como se te indicó en las instrucciones del sistema.
    `;

    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.2, // Baja temperatura para respuestas más consistentes/deterministas
      max_tokens: 150, // Suficiente para el JSON esperado
      // stream: false // Asegúrate que no esté en modo stream
    };

    console.log('[INFO] Enviando a Deepseek Chat (Analyze - Paso 4):', JSON.stringify(payload));

    const dsRes = await axios.post( DEEPSEEK_CHAT_API_URL, payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' }, timeout: 15000 } // Aumentamos timeout a 15s para chat
    );

    console.log('[INFO] Respuesta de Deepseek Chat (Analyze - Paso 4):', JSON.stringify(dsRes.data));

    // **NUEVO: Parsear respuesta del modelo de chat**
    const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
    if (!assistantResponse) throw new Error("Respuesta inesperada o vacía del modelo de chat.");

    console.log('[DEBUG] Contenido de respuesta del asistente:', assistantResponse);

    // Intentar parsear el JSON de la respuesta del asistente
    let evaluation = {};
    try {
        // Limpiar posible markdown de bloque de código si el modelo lo añade
        const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        evaluation = JSON.parse(cleanResponse);
    } catch (parseError) {
        console.error('[ERROR] Fallo al parsear JSON de la respuesta de Deepseek:', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Si falla el parseo, intentamos dar un feedback genérico basado en si la respuesta contiene palabras clave
        const suggestionsFallback = assistantResponse.toLowerCase().includes("mejorar") || assistantResponse.toLowerCase().includes("especificar") ? assistantResponse : "Revisa la estructura del prompt.";
        const okFallback = !(assistantResponse.toLowerCase().includes("mejorar") || assistantResponse.toLowerCase().includes("falta"));
        evaluation = { score: okFallback ? 70 : 30, ok: okFallback, suggestions: suggestionsFallback };
    }


    // Devolver al frontend asegurando que los campos existan
    res.json({
        suggestions: evaluation.suggestions || "No se pudieron generar sugerencias.",
        score: evaluation.score !== undefined ? Number(evaluation.score) : 50,
        ok: evaluation.ok !== undefined ? Boolean(evaluation.ok) : false
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /analyze (Paso 4) ---'); /* ... logging ... */ console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en análisis de prompt con Deepseek Chat'; let statusCode = 500;
    if (error.response?.status === 401) { errorMsg = 'Error Auth Deepseek.'; statusCode = 401; }
    else if (error.response?.data?.error?.message) { errorMsg = error.response.data.error.message; statusCode = error.response.status || 500;}
    else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { errorMsg = 'Timeout Deepseek Chat.'; statusCode = 504; }
    else { errorMsg = `Error inesperado: ${error.message}`; } // Captura otros errores
    res.status(statusCode).json({ error: errorMsg });
  }
});

// --- RUTA: /evaluate (Paso 5: Evaluación Alineación vía Chat) ---
// Esta ruta ha sido modificada
router.post('/evaluate', async (req, res) => {
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: 'Configuración incompleta (sin clave API)' });

  try {
    // Capturamos el prompt COMPLETO que el estudiante escribió en el textarea del Paso 5
    const { prompt: studentPrompt } = req.body;
    if (!studentPrompt?.trim()) return res.status(400).json({ error: 'Prompt vacío.' });

    // Definimos el objetivo específico del reto para que la IA lo tenga presente
    const challengeGoal = "Generar un cuestionario breve (5 preguntas de opción múltiple) sobre la Guerra del Pacífico para alumnos de secundaria.";

    // **System Message específico para el Paso 5 (Evaluación de Alineación)**
    const systemMessage = `
Eres un tutor experto en **Prompt Design Pedagógico**. Tu tarea es evaluar la calidad y alineación del siguiente prompt escrito por un estudiante con un objetivo específico.

El **objetivo específico** que el estudiante debe cumplir con su prompt es: "${challengeGoal}"

**Instrucciones Detalladas para tu Evaluación:**

    1.  **Originalidad y Esfuerzo:**
        *   **Penalización por Copia:** Compara el 'Objetivo' proporcionado por el estudiante con la tarea específica mencionada arriba ("crear una actividad en clase sobre las redes sociales y los estudiantes"). Si el objetivo es una copia casi idéntica o muy superficial de esta tarea, **asigna un score bajo (ej. < 40)** y en las \`suggestions\` indica claramente que debe **reformular el objetivo con sus propias palabras**, añadiendo detalles específicos sobre *qué tipo* de actividad quiere, para *qué nivel* de estudiantes, o *qué aspecto* de las redes sociales abordar. **No aceptes la simple repetición de la tarea.**
        *   **Fomenta la Especificidad:** Incluso si no es una copia directa, valora positivamente (mayor score) cuando el estudiante añade detalles únicos al Rol, Objetivo o Contexto que van más allá del enunciado básico.

    2.  **Análisis Estructural (Rol, Objetivo, Contexto):**
        *   **Rol:** ¿Define un actor claro para la IA (profesor, diseñador instruccional, experto en redes sociales, etc.)? ¿Es relevante para crear una actividad de clase? Un rol genérico es aceptable, pero uno específico es mejor.
        *   **Objetivo:** Aparte de la originalidad, ¿Describe *qué* se debe generar (un debate, una lista de preguntas, un caso de estudio, un proyecto, etc.)? ¿Menciona el *formato* o *extensión*? ¿Define el *propósito* de la actividad?
        *   **Contexto:** ¿Aporta detalles cruciales? (Ej: nivel educativo (secundaria, universidad), asignatura, tiempo disponible para la actividad, enfoque específico (privacidad, fake news, bienestar), herramientas disponibles, restricciones). ¿Ayuda a la IA a entender *cómo* debe ser la actividad?

    3.  **Calidad del Feedback (Suggestions):**
        *   **Constructivo y Accionable:** El feedback debe ser siempre útil. En lugar de solo decir "mal", explica *por qué* y *cómo* mejorar.
        *   **Enfocado en lo Próximo:** Si hay varios puntos débiles, céntrate en la mejora más importante o la más fácil de implementar para el estudiante.
        *   **Tono Didáctico:** Usa un lenguaje claro, alentador y orientado al aprendizaje. Evita jerga técnica innecesaria.
        *   **Ejemplos (Opcional Breve):** Si es relevante, puedes incluir un micro-ejemplo en las sugerencias, ej: "Intenta un objetivo como: 'Diseña una actividad de debate de 30 min para 10mo grado sobre los pros y contras del uso de Instagram'".
- **no debe copiar el objetivo de la actividad como prompt:Generar un cuestionario breve (5 preguntas de opción múltiple) sobre la Guerra del Pacífico para alumnos de secundaria.** 

**NIVELES DE EVALUACIÓN (Semáforo):**

-   **🔴 Rojo (level: "red"):** El prompt es vago, incompleto o mal dirigido. No especifica claramente el tema, cantidad, formato o público objetivo, o contiene errores significativos que impedirían a la IA generar el cuestionario correcto. Se necesita rehacer. El feedback debe indicar claramente qué elementos clave faltan o están incorrectos.
-   **🟡 Amarillo (level: "yellow"):** El prompt incluye algunos de los elementos clave (tema, cantidad, formato, público), pero le falta claridad, precisión o le vendría bien añadir algún detalle (ej. un rol para la IA, un tono específico). La IA podría generar un resultado aceptable, pero hay áreas claras de mejora. El feedback debe ser constructivo y sugerir mejoras específicas.
-   **🟢 Verde (level: "green"):** El prompt es claro, preciso y completo. Especifica el tema, cantidad, formato y público objetivo de manera efectiva. Es muy probable que una IA genere un cuestionario que cumpla el objetivo correctamente. El feedback debe ser positivo o sugerir mejoras menores opcionales.

**Formato de Salida Obligatorio (JSON Estricto):**
Responde **únicamente** con un objeto JSON válido, sin texto adicional. El objeto debe tener las siguientes claves:
*   \`"level"\`: (String) Debe ser "red", "yellow" o "green".
*   \`"feedback"\`: (String) Un mensaje breve y constructivo (máx. 3 frases) explicando la evaluación y las recomendaciones. Si el nivel es "green", puede ser un elogio.

**Ejemplo Salida (Caso Rojo):**
\`\`\`json
{
  "level": "red",
  "feedback": "Tu prompt no especifica el tema (Guerra del Pacífico) ni la cantidad de preguntas. Debes ser más claro en qué quieres generar."
}
\`\`\`

 **Ejemplo Salida (Caso Amarillo):**
\`\`\`json
{
  "level": "yellow",
  "feedback": "Especificaste el tema, pero no la cantidad (5) ni el formato (opción múltiple). Añade esos detalles para mayor precisión."
}
\`\`\`

**Ejemplo Salida (Caso Verde):**
\`\`\`json
{
  "level": "green",
  "feedback": "¡Excelente! Tu prompt es claro y especifica el tema, cantidad, formato y público. La IA entenderá perfecto."
}
\`\`\`

Ahora, evalúa el siguiente prompt del estudiante basado en estas instrucciones.
`; // Fin del systemMessage para Paso 5

    // El userMessage para Paso 5 es el prompt completo del estudiante que se va a evaluar
    const userMessage = studentPrompt; // <-- El prompt completo del alumno

    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemMessage }, // <-- Usamos el NUEVO systemMessage específico para Paso 5
        { role: 'user', content: userMessage }     // <-- Usamos el prompt completo del alumno como user message
      ],
      temperature: 0.2, // Baja para consistencia
      max_tokens: 200, // Aumentamos ligeramente max_tokens para el feedback
      // stream: false
    };

    console.log('[INFO] Enviando a Deepseek Chat (Evaluate - Paso 5):', JSON.stringify(payload));

    const dsRes = await axios.post( DEEPSEEK_CHAT_API_URL, payload,
      { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' }, timeout: 20000 } // Aumentar timeout a 20s
    );

    console.log('[INFO] Respuesta de Deepseek Chat (Evaluate - Paso 5):', JSON.stringify(dsRes.data));

    const assistantResponse = dsRes.data?.choices?.[0]?.message?.content;
     if (!assistantResponse) throw new Error("Respuesta inesperada o vacía del modelo de chat.");

    console.log('[DEBUG] Contenido de respuesta del asistente:', assistantResponse);

    // Intentar parsear el JSON esperado { "level": "...", "feedback": "..." }
    let evaluation = {};
     try {
         // Limpiar posible markdown de bloque de código (```json)
         const cleanResponse = assistantResponse.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
         evaluation = JSON.parse(cleanResponse);

         // Validar que las claves esperadas existan después del parseo
         if (evaluation.level === undefined || evaluation.feedback === undefined) {
             throw new Error("JSON parseado no contiene las claves 'level' o 'feedback'.");
         }

     } catch (parseError) {
        console.error('[ERROR] Fallo al parsear/validar JSON de la respuesta de Deepseek (Paso 5):', parseError);
        console.error('[ERROR] Respuesta recibida que falló el parseo:', assistantResponse);
        // Fallback robusto si falla el parseo o validación del JSON
        const feedbackFallback = assistantResponse.length > 5 && assistantResponse.length < 200 ? assistantResponse : "La evaluación automática tuvo un problema. Revisa tu prompt."; // Usar la respuesta cruda si no es muy larga
        const lowerCaseFeedback = feedbackFallback.toLowerCase();

        const levelFallback = lowerCaseFeedback.includes("excelente") || lowerCaseFeedback.includes("verde") || lowerCaseFeedback.includes("cumple") ? "green" :
                              (lowerCaseFeedback.includes("mejorar") || lowerCaseFeedback.includes("amarillo") || lowerCaseFeedback.includes("falta") || lowerCaseFeedback.includes("poco claro") ? "yellow" : "red");

        evaluation = { level: levelFallback, feedback: `[FALLBACK] ${feedbackFallback}` }; // Prefijo para indicar fallback
    }

    // Asegurar que el nivel sea siempre uno de los válidos ('red', 'yellow', 'green')
    const validLevels = ['red', 'yellow', 'green'];
    const finalLevel = validLevels.includes(evaluation.level?.toLowerCase()) ? evaluation.level.toLowerCase() : 'red';

    // Devolver al frontend
    res.json({
        level: finalLevel,
        feedback: evaluation.feedback || "No se pudo generar feedback.",
        // Opcional: Incluir el score si el frontend lo necesita para algo (aunque el level es el principal)
        // score: finalLevel === 'green' ? 100 : (finalLevel === 'yellow' ? 75 : 25)
    });

  } catch (error) {
    console.error('--- ERROR DETALLADO en /evaluate (Paso 5) ---');
    console.error('Mensaje:', error.message);
    let errorMsg = 'Fallo en evaluación de prompt con Deepseek Chat';
    let statusCode = 500;
    if (axios.isAxiosError(error)) { // Manejar errores de Axios específicamente
        if (error.response) {
            // El servidor Deepseek respondió con un status code fuera del 2xx
            errorMsg = error.response.data?.error?.message || `Error HTTP ${error.response.status} de Deepseek`;
            statusCode = error.response.status;
            console.error('Respuesta de error de Deepseek:', error.response.data);
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
             errorMsg = 'No se recibió respuesta de Deepseek.';
             statusCode = 503; // Service Unavailable
             console.error('No se recibió respuesta de Deepseek:', error.request);
        } else {
            // Algo pasó al configurar la petición
             errorMsg = `Error al preparar la petición a Deepseek: ${error.message}`;
             statusCode = 500;
             console.error('Error de Axios al preparar petición:', error.message);
        }
    } else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) {
       errorMsg = 'Tiempo de espera agotado con Deepseek Chat.';
       statusCode = 504; // Gateway Timeout
    }
     else {
        // Otros errores inesperados
         errorMsg = `Error inesperado: ${error.message}`;
         statusCode = 500;
     }

    // Enviar una respuesta de error estructurada al frontend
    res.status(statusCode).json({
        level: 'red', // En caso de error del backend, el resultado para el alumno es siempre rojo
        feedback: `Error al evaluar tu prompt: ${errorMsg}. Intenta de nuevo más tarde.`,
        error: errorMsg // Opcional: enviar el mensaje de error detallado para depuración
    });
  }
});

// --- MONTAJE Y EXPORTACIÓN (CommonJS) ---
app.use('/api', router);
module.exports.handler = serverless(app);