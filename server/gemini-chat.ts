import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

console.log("Initializing Gemini AI for energy optimization chat...");
console.log("API Key present:", !!process.env.GOOGLE_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function generateEnergyOptimizationResponse(
  userMessage: string,
  userContext?: {
    username: string;
    location?: string;
    households?: any[];
    energyData?: any;
  }
): Promise<string> {
  try {
    console.log("Generating AI response for energy optimization query");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const contextInfo = userContext ? `
USER CONTEXT:
- Name: ${userContext.username}
- Location: ${userContext.location || 'Not specified'}
- Households: ${userContext.households?.length || 0} registered
- Current Energy Data: ${userContext.energyData ? 'Available' : 'Not available'}
` : '';

    const systemPrompt = `You are a helpful SolarSense energy advisor. 

${contextInfo}

RESPONSE RULES:
- Write 2-3 sentences maximum (never exceed 10 sentences)
- Be helpful and practical
- Use simple, clear language
- Focus on actionable advice

USER QUESTION: ${userMessage}

ANSWER:`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("AI response generated successfully");
    return text;

  } catch (error) {
    console.error('Gemini AI error:', error);
    
    // Fallback responses (2-3 sentences)
    if (userMessage.toLowerCase().includes('solar')) {
      return "Keep your solar panels clean and free of debris. Check for shading from trees or buildings that might reduce efficiency. Monitor peak sun hours between 10 AM and 2 PM for best performance.";
    } else if (userMessage.toLowerCase().includes('battery')) {
      return "Avoid deep discharge cycles to extend battery life. Keep batteries between 20-80% charge when possible. Monitor temperature as batteries work best in moderate conditions.";
    } else {
      return "I'm having trouble connecting to the AI service right now. Please try again in a moment. Feel free to ask about solar panels, batteries, or energy trading.";
    }
  }
}