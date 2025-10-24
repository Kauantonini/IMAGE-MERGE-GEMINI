
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { ImagePart } from '../types';

// Note: In a real-world scenario, this logic would reside on a secure backend server.
// The user's request specified a backend, but due to platform constraints,
// this is implemented on the client-side for this self-contained application.
// The API key is handled by the environment and should not be exposed in client code.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateImageFromReferences = async (
  imageParts: ImagePart[],
  aspectRatio: string
): Promise<string> => {
  if (imageParts.length < 2 || imageParts.length > 4) {
    throw new Error("Please provide 2 to 4 reference images.");
  }
  
  const model = ai.models;

  const prompt = `Combine the visual characteristics (style, colors, lighting, pose, outfit vibe, composition) of these reference images into a single new, coherent, and realistic image. The final image must have a ${aspectRatio} aspect ratio. Ensure consistent anatomy and lighting. The image should be high-detail, photorealistic, and PG-13. Crucially, DO NOT include any text, watermarks, or UI elements in the final image.`;

  const textPart: Part = { text: prompt };
  
  const contents: Part[] = [textPart, ...imageParts];

  try {
    const response = await model.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: contents },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image was generated. The model may have refused the request due to safety policies.");

  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image generation.";
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};
