import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";
import type { InstallationResult, FaultResult } from "../shared/schema";
import dotenv from "dotenv";
import { 
  performInstallationCalculations, 
  calculateOptimalPanelCount, 
  validateCalculationInputs,
  getMarketStandardsSummary,
  MARKET_STANDARDS 
} from './calculation-service.js';
import { apiCache, generateImageCacheKey } from './api-cache';

// Load environment variables first
dotenv.config();

console.log("Initializing Google AI SDK...");
console.log("API Key present:", !!process.env.GOOGLE_API_KEY);
console.log("API Key length:", process.env.GOOGLE_API_KEY?.length || 0);

const ai = new GoogleGenAI(process.env.GOOGLE_API_KEY || "");

// Image preprocessing and validation with performance optimization
function validateImage(imagePath: string): boolean {
  try {
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    // Check file size (max 8MB for better performance, Gemini supports up to 20MB)
    if (fileSizeInMB > 8) {
      console.warn(`Image size ${fileSizeInMB.toFixed(2)}MB exceeds 8MB performance limit`);
      return false;
    }
    
    // Check if file exists and is readable
    fs.accessSync(imagePath, fs.constants.R_OK);
    
    // Additional performance check - ensure file is not corrupted
    const buffer = fs.readFileSync(imagePath, { flag: 'r' });
    if (buffer.length === 0) {
      console.error('Image file is empty or corrupted');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Image validation failed:', error);
    return false;
  }
}

// Image classification cache to reduce API calls
const classificationCache = new Map<string, { result: boolean; timestamp: number; type: string }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

// Image classification to ensure only solar panel/roof images are processed
export async function classifyImage(imagePath: string, expectedType: 'rooftop' | 'solar-panel'): Promise<boolean> {
  try {
    console.log(`Classifying image for ${expectedType} content`);
    
    // Generate cache key based on file size and type (simple hash alternative)
    const stats = fs.statSync(imagePath);
    const cacheKey = `${stats.size}-${stats.mtime.getTime()}-${expectedType}`;
    
    // Check cache first to avoid unnecessary API calls
    const cached = classificationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('Using cached classification result');
      return cached.result;
    }
    
    // Clean up old cache entries
    const now = Date.now();
    for (const [key, entry] of classificationCache.entries()) {
      if (now - entry.timestamp > CACHE_DURATION) {
        classificationCache.delete(key);
      }
    }
    
    const imageBytes = fs.readFileSync(imagePath);
    const mimeType = getMimeType(imagePath);
    
    const classificationPrompt = expectedType === 'rooftop' 
      ? `Analyze this image quickly. Reply with JSON: {"isValid": boolean, "reason": string}
         
         VALID if shows: rooftop, building roof, house exterior with roof visible.
         INVALID if shows: no roof, indoors, people, cars, landscapes, existing solar panels.`
      : `Analyze this image quickly. Reply with JSON: {"isValid": boolean, "reason": string}
         
         VALID if shows: solar panels, photovoltaic modules, solar arrays.
         INVALID if shows: no solar panels, rooftops only, other objects.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            { text: classificationPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBytes.toString('base64')
              }
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 50, // Reduced tokens for faster classification
        temperature: 0.1, // Lower temperature for faster responses
        topP: 0.9, // Optimized for efficiency
      }
    });
    
    const responseText = result.text;
    console.log('AI Classification Response:', responseText);
    
    // Parse the AI response
    const cleanedText = responseText.replace(/```json\n?|```\n?/g, '').trim();
    const result_data = JSON.parse(cleanedText);
    
    console.log('Classification result:', result_data);
    
    const isValid = result_data.isValid === true;
    
    // Cache the result to avoid repeated API calls
    classificationCache.set(cacheKey, {
      result: isValid,
      timestamp: Date.now(),
      type: expectedType
    });
    
    return isValid;
  } catch (error) {
    console.error('Image classification failed:', error);
    console.log('Classification error - allowing image to proceed with analysis');
    return true; // Allow if classification fails to avoid blocking valid images
  }
}

function getMimeType(imagePath: string): string {
  const extension = imagePath.toLowerCase().split('.').pop();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // Default fallback
  }
}

export async function analyzeInstallationWithAI(imagePath: string, roofInput?: any): Promise<InstallationResult> {
  console.log("Starting AI-powered installation analysis");
  const maxRetries = 3;
  let lastError: any;

  // Validate image before processing
  if (!validateImage(imagePath)) {
    console.error('Image validation failed');
    throw new Error('Invalid image format. Please upload a valid image file.');
  }

  // Validate image content for rooftop analysis
  console.log('Validating image content for rooftop analysis...');
  const isValidRooftop = await classifyImage(imagePath, 'rooftop');
  if (!isValidRooftop) {
    console.error('Image classification failed: Not a valid rooftop image');
    throw new Error('This image does not show a rooftop suitable for solar panel installation. Please upload an image showing a building roof from above or at an angle.');
  }
  console.log('Image validation passed: Valid rooftop detected');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI analysis attempt ${attempt}/${maxRetries}`);
      
      const imageBytes = fs.readFileSync(imagePath);
      const mimeType = getMimeType(imagePath);
      
      // Calculate panel size adjustments based on roof size
      let panelSizeAdjustment = '';
      if (roofInput?.roofSize) {
        const roofSize = parseInt(roofInput.roofSize);
        if (roofSize < 800) {
          panelSizeAdjustment = 'Small roof detected - use smaller panel dimensions (0.06-0.08 width, 0.04-0.06 height)';
        } else if (roofSize > 2000) {
          panelSizeAdjustment = 'Large roof detected - use standard panel dimensions (0.08-0.10 width, 0.06-0.08 height)';
        } else {
          panelSizeAdjustment = 'Medium roof detected - use medium panel dimensions (0.07-0.09 width, 0.05-0.07 height)';
        }
      }

      const roofInputInfo = roofInput ? `
      USER-PROVIDED ROOF INFORMATION:
      - Roof Size: ${roofInput.roofSize ? `${roofInput.roofSize} sq ft` : 'Auto-detect from image'}
      - Roof Shape: ${roofInput.roofShape}
      - Panel Size Preference: ${roofInput.panelSize}
      ${panelSizeAdjustment ? `- Panel Size Adjustment: ${panelSizeAdjustment}` : ''}
      
      INSTRUCTIONS: Use this information to cross-validate your image analysis. If provided roof size differs significantly from your visual estimate, note the discrepancy and use the user's input as the primary reference.
      ` : '';

      const installationPrompt = `
      You are a solar panel expert analyzing rooftop images. Provide ONLY basic roof data - no panel placement or calculations.
      
      REQUIRED ANALYSIS:
      
      1. ROOF MEASUREMENTS
      - Estimate total roof area in square feet
      - Calculate usable roof area (after removing obstructions and clearances)
      - Recommend optimal panel count based on roof size and suitability
      
      2. ORIENTATION ANALYSIS
      - Identify primary roof orientation (south, southeast, southwest, east, west, northeast, northwest, north)
      - Explain which roof faces receive best sun exposure
      
      3. ROOF CONDITIONS
      - Analyze roof pitch (flat, low, optimal, steep, very_steep)
      - Assess shading impact (none, minimal, light, moderate, heavy, severe)
      - Identify roof type and material
      
      4. INSTALLATION NOTES
      - Safety considerations for this roof type
      - Special requirements for roof material
      - Clearance and obstruction recommendations

      ${roofInputInfo}

      IMPORTANT: Do NOT create panel regions or coordinates. Only provide roof analysis data.
      
      Respond with this EXACT JSON structure:
      {
        "primaryOrientation": "<select from: south, southeast, southwest, east, west, northeast, northwest, north>",
        "pitchCategory": "<select from: flat, low, optimal, steep, very_steep>",
        "shadingLevel": "<select from: none, minimal, light, moderate, heavy, severe>",
        "orientationAnalysis": "<detailed orientation analysis explaining best roof faces>",
        "shadingAnalysis": "<detailed shading analysis with timing and seasonal effects>",
        "notes": "<installation notes with bullet points for clearances and safety>",
        "roofType": "<detected roof type>",
        "estimatedRoofArea": <integer in sq ft>,
        "usableRoofArea": <integer in sq ft after obstructions>,
        "recommendedPanels": <integer - optimal panel count for this roof>,
        "confidence": <percentage as integer>
      }
      
      Focus on roof analysis only. Backend will handle all calculations.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              { text: installationPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBytes.toString('base64')
                }
              }
            ]
          }
        ]
      });
      
      const responseText = result.text;
      console.log('AI Installation Response:', responseText);
      
      // Parse the AI response
      const cleanedText = responseText.replace(/```json\n?|```\n?/g, '').trim();
      const aiResult = JSON.parse(cleanedText);
      
      // Get AI's basic roof data and recommended panel count
      const finalPanelCount = aiResult.recommendedPanels || 4; // Use AI's recommendation
      
      console.log(`AI Roof Analysis: ${finalPanelCount} panels recommended, ${aiResult.primaryOrientation} orientation, ${aiResult.pitchCategory} pitch, ${aiResult.shadingLevel} shading`);
      
      // Use user-provided roof size if available, otherwise use AI estimate
      const finalRoofArea = roofInput?.roofSize ? parseInt(roofInput.roofSize) : aiResult.usableRoofArea;
      
      // Manual calculations using simple market standards
      const PANEL_AREA = 21.125; // sq ft per panel (standard size)
      const PANEL_POWER = 0.4; // kW per panel (400W)
      
      // Calculate roof coverage: usable_area ÷ total_area × 100
      const coveragePercentage = Math.round((finalRoofArea / aiResult.estimatedRoofArea) * 100 * 100) / 100;
      
      // Calculate power output: panels × power_per_panel
      const powerOutputKW = finalPanelCount * PANEL_POWER;
      
      // Manual efficiency calculation based on orientation
      let efficiencyScore = 75; // Base efficiency
      if (aiResult.primaryOrientation === 'south') efficiencyScore = 90;
      else if (aiResult.primaryOrientation === 'southeast' || aiResult.primaryOrientation === 'southwest') efficiencyScore = 85;
      else if (aiResult.primaryOrientation === 'east' || aiResult.primaryOrientation === 'west') efficiencyScore = 75;
      else efficiencyScore = 65;
      
      // Adjust for pitch
      if (aiResult.pitchCategory === 'optimal') efficiencyScore += 5;
      else if (aiResult.pitchCategory === 'steep' || aiResult.pitchCategory === 'flat') efficiencyScore -= 5;
      
      // Adjust for shading
      if (aiResult.shadingLevel === 'none') efficiencyScore += 5;
      else if (aiResult.shadingLevel === 'minimal') efficiencyScore += 2;
      else if (aiResult.shadingLevel === 'light') efficiencyScore -= 2;
      else if (aiResult.shadingLevel === 'moderate') efficiencyScore -= 10;
      else efficiencyScore -= 20;
      
      // Keep efficiency within realistic bounds
      efficiencyScore = Math.max(60, Math.min(95, efficiencyScore));
      
      // Generate realistic panel regions only on roof surfaces, avoiding obstacles
      const generatedRegions = [];
      const panelWidth = 0.08;  // Smaller, more realistic panel size
      const panelHeight = 0.06;
      const minSpacing = 0.02;  // Minimum spacing between panels
      
      // Define safe roof areas with better coverage (using more of the available roof)
      const safeRoofAreas = [
        // Expanded roof sections for better utilization
        { x: 0.15, y: 0.25, width: 0.35, height: 0.35 }, // Left main section
        { x: 0.55, y: 0.25, width: 0.35, height: 0.35 }, // Right main section
        { x: 0.20, y: 0.65, width: 0.60, height: 0.20 }, // Lower section (expanded)
        { x: 0.25, y: 0.15, width: 0.50, height: 0.08 }  // Upper section (new)
      ];
      
      // Calculate total roof capacity first
      let totalRoofCapacity = 0;
      for (const area of safeRoofAreas) {
        const panelsPerRow = Math.floor(area.width / (panelWidth + minSpacing));
        const panelsPerCol = Math.floor(area.height / (panelHeight + minSpacing));
        totalRoofCapacity += panelsPerRow * panelsPerCol;
      }
      
      // Use the smaller of AI recommendation or actual roof capacity for optimal utilization
      const optimalPanelCount = Math.min(finalPanelCount, totalRoofCapacity);
      
      let panelsPlaced = 0;
      
      // Place panels to maximize roof utilization
      for (const area of safeRoofAreas) {
        if (panelsPlaced >= optimalPanelCount) break;
        
        // Calculate how many panels can fit in this area
        const panelsPerRow = Math.floor(area.width / (panelWidth + minSpacing));
        const panelsPerCol = Math.floor(area.height / (panelHeight + minSpacing));
        
        // Place all possible panels in this area (up to remaining count)
        for (let row = 0; row < panelsPerCol && panelsPlaced < optimalPanelCount; row++) {
          for (let col = 0; col < panelsPerRow && panelsPlaced < optimalPanelCount; col++) {
            const panelX = area.x + col * (panelWidth + minSpacing);
            const panelY = area.y + row * (panelHeight + minSpacing);
            
            // Ensure panel stays within area bounds
            if (panelX + panelWidth <= area.x + area.width && 
                panelY + panelHeight <= area.y + area.height) {
              generatedRegions.push({
                x: panelX,
                y: panelY,
                width: panelWidth,
                height: panelHeight
              });
              panelsPlaced++;
            }
          }
        }
      }
      
      // If we couldn't place all panels in safe areas, adjust the count
      const actualPanelsPlaced = generatedRegions.length;
      if (actualPanelsPlaced < finalPanelCount) {
        console.log(`Adjusted panel count from ${finalPanelCount} to ${actualPanelsPlaced} due to roof constraints`);
      }
      
      // Recalculate with actual placed panels
      const finalActualPanelCount = actualPanelsPlaced;
      const finalPowerOutputKW = finalActualPanelCount * PANEL_POWER;
      // Coverage remains the same: usable_area ÷ total_area × 100
      const finalCoveragePercentage = coveragePercentage;
      
      console.log(`Backend Calculations: ${finalActualPanelCount} panels placed on roof, ${finalCoveragePercentage}% coverage, ${finalPowerOutputKW}kW power, ${efficiencyScore}% efficiency`);
      
      // Use manual calculations and generated regions for consistent results
      const result_data: InstallationResult = {
        totalPanels: finalActualPanelCount,
        coverage: finalCoveragePercentage,
        powerOutput: finalPowerOutputKW,
        efficiency: efficiencyScore,
        confidence: aiResult.confidence,
        orientation: aiResult.orientationAnalysis,
        shadingAnalysis: aiResult.shadingAnalysis,
        notes: aiResult.notes,
        roofType: aiResult.roofType,
        estimatedRoofArea: aiResult.estimatedRoofArea,
        usableRoofArea: finalRoofArea,
        obstructions: [],
        regions: generatedRegions
      };
      
      console.log('Installation analysis completed successfully');
      return result_data;
      
    } catch (error) {
      console.error('Installation analysis failed:', error);
      lastError = error;
      
      if (attempt === maxRetries) {
        console.error('AI analysis failed after all retries, no fallback available');
        throw new Error('AI analysis service is currently unavailable. Please try again later or contact support.');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  // Should never reach here due to throw statements above
  throw new Error('AI analysis service is currently unavailable. Please try again later or contact support.');
}

export async function analyzeFaultsWithAI(imagePath: string, originalFilename?: string): Promise<FaultResult> {
  console.log("Starting AI-powered fault detection analysis");
  const maxRetries = 3;
  let lastError: any;

  // Validate image before processing
  if (!validateImage(imagePath)) {
    console.error('Image validation failed');
    throw new Error('Invalid image format. Please upload a valid image file.');
  }

  // Validate image content for solar panel analysis
  console.log('Validating image content for solar panel analysis...');
  const isValidSolarPanel = await classifyImage(imagePath, 'solar-panel');
  if (!isValidSolarPanel) {
    console.error('Image classification failed: Not a valid solar panel image');
    throw new Error('This image does not show solar panels suitable for fault detection. Please upload an image showing solar panels or photovoltaic equipment.');
  }
  console.log('Image validation passed: Valid solar panel detected');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI analysis attempt ${attempt}/${maxRetries}`);
      
      const imageBytes = fs.readFileSync(imagePath);
      const mimeType = getMimeType(imagePath);

      // Use original filename if provided, otherwise generate professional panel ID
      const panelId = originalFilename 
        ? originalFilename.replace(/\.[^/.]+$/, "") // Remove file extension
        : `Panel-${Date.now().toString().slice(-3)}`;

      const faultPrompt = `
      You are a certified solar panel inspection expert with 20+ years of experience in photovoltaic system diagnostics. Analyze this solar panel image with extreme precision and identify ALL visible faults, defects, or performance issues.

      PANEL IDENTIFICATION: ${panelId}

      MANDATORY FAULT DETECTION PROTOCOL:

      STEP 1: VISUAL INSPECTION CHECKLIST
      Examine the solar panel systematically for:
      
      PHYSICAL DAMAGE:
      - Cracks: hairline, spider web, stress fractures, or complete breaks
      - Chips: missing pieces, edge damage, or impact marks
      - Delamination: bubbling, peeling, or separation of layers
      - Cell damage: broken cells, burned spots, or discoloration
      - Frame damage: bent corners, loose mounting, or corrosion
      
      PERFORMANCE ISSUES:
      - Hot spots: darker regions indicating electrical problems
      - Shading: partial or complete obstruction from debris, dirt, or objects
      - Soiling: dust, dirt, bird droppings, or organic growth
      - Discoloration: yellowing, browning, or unusual color variations
      - Micro-cracks: barely visible hairline fractures
      
      ELECTRICAL CONCERNS:
      - Burn marks: indicating electrical arcing or overheating
      - Corrosion: metal oxidation or deterioration
      - Connection issues: loose wiring or damaged junction boxes
      - Bypass diode failures: irregular heat patterns
      
      STEP 2: SEVERITY ASSESSMENT
      For each fault detected, assign severity:
      - Critical: Immediate safety hazard, total system shutdown required
      - High: Significant performance loss (>15%), urgent repair needed
      - Medium: Moderate performance impact (5-15%), schedule maintenance
      - Low: Minor cosmetic issues (<5% impact), monitor condition
      
      STEP 3: COORDINATE MAPPING
      For each fault, provide precise normalized coordinates (0-1) where:
      - x: horizontal position (0=left edge, 1=right edge)
      - y: vertical position (0=top edge, 1=bottom edge)
      - Ensure coordinates are within panel boundaries
      
      STEP 4: OVERALL HEALTH ASSESSMENT
      Determine overall panel health based on:
      - Excellent: No visible defects, optimal performance
      - Good: Minor issues, >90% performance
      - Fair: Moderate issues, 70-90% performance  
      - Poor: Significant problems, 50-70% performance
      - Critical: Dangerous condition, <50% performance
      
      STEP 5: PROFESSIONAL MAINTENANCE RECOMMENDATIONS
      Generate SPECIFIC, UNIQUE maintenance recommendations based on each detected fault type. DO NOT use generic recommendations.
      
      FOR EACH FAULT TYPE, provide tailored maintenance actions:
      
      CRACKS (all severities):
      - Critical: "Immediate system shutdown and panel replacement within 24 hours"
      - High: "Professional inspection within 1 week, assess for replacement" 
      - Medium: "Monitor crack progression monthly, schedule repair assessment"
      - Low: "Document crack pattern, inspect quarterly for expansion"
      
      DELAMINATION:
      - Critical: "Emergency panel replacement - delamination compromises electrical safety"
      - High: "Replace panel within 2 weeks to prevent moisture infiltration"
      - Medium: "Apply protective sealant if possible, replace within 6 months"
      - Low: "Monitor adhesion integrity, schedule replacement within 1 year"
      
      HOT SPOTS:
      - Critical: "Immediate electrical isolation - fire hazard present"
      - High: "Thermal imaging inspection and bypass diode replacement"
      - Medium: "Clean connections and verify wiring integrity"
      - Low: "Monitor temperature patterns during peak sun hours"
      
      SOILING/DIRT:
      - Critical: "Complete system cleaning and performance restoration"
      - High: "Professional cleaning service within 1 month"
      - Medium: "Schedule quarterly cleaning maintenance"
      - Low: "Regular monthly cleaning with soft brush and water"
      
      ELECTRICAL ISSUES:
      - Critical: "Licensed electrician inspection immediately - safety hazard"
      - High: "Certified technician diagnosis within 48 hours"
      - Medium: "Electrical connection audit and cleaning"
      - Low: "Annual electrical system check and maintenance"
      
      FRAME DAMAGE:
      - Critical: "Structural assessment and immediate panel securing"
      - High: "Frame repair or panel replacement within 2 weeks"
      - Medium: "Reinforce mounting and check structural integrity"
      - Low: "Apply protective coating to prevent corrosion"
      
      Generate 3-5 specific recommendations that match the EXACT fault types detected, not generic advice.
      
      CRITICAL REQUIREMENTS:
      1. Only report faults that are clearly visible in the image
      2. Use accurate coordinate mapping within panel boundaries
      3. Provide realistic severity assessments
      4. Generate professional maintenance recommendations
      5. Base overall health on actual fault severity and quantity
      
      Respond with a JSON object matching this EXACT structure:
      {
        "panelId": "${panelId}",
        "faults": [
          {
            "type": "<fault type>",
            "severity": "<Critical|High|Medium|Low>",
            "x": <normalized coordinate 0-1>,
            "y": <normalized coordinate 0-1>,
            "description": "<detailed description>"
          }
        ],
        "overallHealth": "<Excellent|Good|Fair|Poor|Critical>",
        "recommendations": [
          "<specific recommendation 1>",
          "<specific recommendation 2>",
          "<specific recommendation 3>"
        ]
      }
      
      Remember: Your analysis will be used for actual solar panel maintenance decisions. Accuracy and safety are PARAMOUNT. Only report faults that are clearly visible and verifiable in the image.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              { text: faultPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBytes.toString('base64')
                }
              }
            ]
          }
        ]
      });
      
      const responseText = result.text;
      console.log('AI Fault Detection Response:', responseText);
      
      // Parse the AI response
      const cleanedText = responseText.replace(/```json\n?|```\n?/g, '').trim();
      const result_data: FaultResult = JSON.parse(cleanedText);
      
      console.log('Fault detection analysis successful');
      return result_data;
      
    } catch (error) {
      console.error('Fault detection analysis failed:', error);
      lastError = error;
      
      if (attempt === maxRetries) {
        console.error('AI analysis failed after all retries, no fallback available');
        throw new Error('AI analysis service is currently unavailable. Please try again later or contact support.');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  // Should never reach here due to throw statements above
  throw new Error('AI analysis service is currently unavailable. Please try again later or contact support.');
}