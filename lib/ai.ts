/**
 * This file contains functions for interacting with the Gemini AI model
 * to generate drawings from text prompts.
 */
import { GoogleGenAI, Type } from "@google/genai";
import type { Anchor } from '../types';

// Lazily initialize the AI client to prevent app crashes on load
// if the environment variables are not available.
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (ai) {
    return ai;
  }
  
  // The prompt requires using process.env.API_KEY. This check prevents a
  // ReferenceError in browser environments where `process` is not defined.
  let apiKey: string | undefined;
  if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    // This error will be caught by the handler in App.tsx and shown to the user.
    throw new Error("API_KEY environment variable not set.");
  }
  
  ai = new GoogleGenAI({ apiKey });
  return ai;
}


const pointSchema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER, description: "The x-coordinate." },
    y: { type: Type.NUMBER, description: "The y-coordinate." },
  },
  required: ['x', 'y'],
};

const schema = {
  type: Type.ARRAY,
  description: "An array of anchor points that form the drawing.",
  items: {
    type: Type.OBJECT,
    description: "A single anchor point on the Bézier curve.",
    properties: {
      point: { ...pointSchema, description: "The coordinates of the anchor point itself." },
      handleIn: { ...pointSchema, description: "The control handle for the curve segment entering this anchor point." },
      handleOut: { ...pointSchema, description: "The control handle for the curve segment leaving this anchor point." },
    },
    required: ['point', 'handleIn', 'handleOut'],
  },
};

export async function generateDrawingFromPrompt(prompt: string): Promise<Anchor[]> {
  const systemInstruction = `You are an expert at creating vector drawings. Convert the following description into a single, continuous vector path: "${prompt}".
The path should be represented as a JSON array of anchor points. The coordinate space is a 100x100 box where (0,0) is the top-left corner.
Each anchor point object in the array should have three properties: "point", "handleIn", and "handleOut", each with "x" and "y" coordinates.
For a smooth curve, "handleIn", "point", and "handleOut" should be collinear, with the point in the middle.
The first anchor's "handleIn" should be the same as its "point".
The last anchor's "handleOut" should be the same as its "point".
The drawing should be simple and suitable for a single-stroke rendering.`;

  try {
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a drawing for: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: systemInstruction,
      },
    });

    const jsonText = response.text.trim();
    const generatedAnchors = JSON.parse(jsonText);

    if (!Array.isArray(generatedAnchors) || generatedAnchors.length === 0) {
      console.error("AI response is not a valid array of anchors:", generatedAnchors);
      throw new Error("The AI did not return a valid drawing. Please try a different prompt.");
    }
    
    // Simple validation
    const isValid = generatedAnchors.every(a =>
        a.point && typeof a.point.x === 'number' && typeof a.point.y === 'number' &&
        a.handleIn && typeof a.handleIn.x === 'number' && typeof a.handleIn.y === 'number' &&
        a.handleOut && typeof a.handleOut.x === 'number' && typeof a.handleOut.y === 'number'
    );

    if (!isValid) {
        console.error("AI response contains invalid anchor data:", generatedAnchors);
        throw new Error("The AI returned data in an unexpected format.");
    }

    return generatedAnchors as Anchor[];
  } catch (error) {
    console.error("Error generating drawing from AI:", error);
    // Re-throw a more user-friendly error message.
    if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error("AI features are unavailable. The API Key is invalid or missing.");
    }
    throw new Error("Could not generate drawing. The model may be busy or the prompt could not be processed.");
  }
}