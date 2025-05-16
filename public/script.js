// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const gestureText = document.getElementById('gesture-text');

// Model and gesture mapping
let model = null;
let gestureMapping = {};
let usingFallbackMode = false;

// Variables for stable gesture recognition
let lastUpdateTime = 0;
let stableGesture = '';
let stableConfidence = 0;
let gestureHistory = [];
let gestureCounter = {};
let stabilityDelay = 1000; // Require 1 second of consistent gesture before changing

// Initialize MediaPipe Hands
async function initializeHandDetection() {
    try {
        console.log("Initializing hand detection...");
        gestureText.textContent = 'Initializing camera...';
        
        // First, try to get camera access directly
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            video.srcObject = stream;
            console.log("Camera access granted directly");
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    console.log("Video metadata loaded");
                    resolve();
                };
                video.onloadeddata = () => {
                    console.log("Video data loaded");
                };
                video.onerror = (error) => {
                    console.error("Video error:", error);
                };
                
                // Fallback if onloadedmetadata doesn't trigger
                setTimeout(resolve, 1000);
            });
            
            console.log("Video element ready");
        } catch (error) {
            console.error("Camera access error:", error);
            gestureText.textContent = 'Camera access denied. Please allow camera access and refresh the page.';
            throw error;
        }
        
        // Check if MediaPipe is loaded
        if (typeof Hands === 'undefined') {
            console.error('MediaPipe Hands not loaded');
            gestureText.textContent = 'MediaPipe not loaded. Please check your internet connection and refresh.';
            throw new Error('MediaPipe Hands not loaded');
        }

        console.log("Creating MediaPipe Hands instance...");
        const hands = new Hands({
            locateFile: (file) => {
                const url = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                console.log("Loading MediaPipe file:", url);
                return url;
            }
        });

        console.log("Setting MediaPipe Hands options...");
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        console.log("Setting up hand detection results handler...");
        hands.onResults((results) => {
            console.log("Hand detection results received");
            onHandResults(results);
        });

        // Check if Camera is loaded
        if (typeof Camera === 'undefined') {
            console.error('MediaPipe Camera not loaded');
            gestureText.textContent = 'Camera API not loaded. Please check your internet connection and refresh.';
            throw new Error('MediaPipe Camera not loaded');
        }

        console.log("Setting up MediaPipe camera...");
        const camera = new Camera(video, {
            onFrame: async () => {
                try {
                    await hands.send({image: video});
                } catch (error) {
                    console.error('Error sending frame to hands:', error);
                }
            },
            width: 640,
            height: 480
        });

        console.log("Starting camera...");
        await camera.start();
        console.log("Camera started successfully");
        gestureText.textContent = 'Camera ready! Show your hand...';
        return { hands, camera };
    } catch (error) {
        console.error('Error initializing hand detection:', error);
        gestureText.textContent = 'Error initializing camera. Please check your camera permissions and refresh the page.';
        throw error;
    }
}

// More robust finger position detection
function isFingerExtended(fingerTip, fingerBase, wrist, threshold = 0.15) {
    // Check if the finger is extended by comparing to the base of the finger and wrist
    const tipToWristY = fingerTip.y - wrist.y;
    const baseToWristY = fingerBase.y - wrist.y;
    
    // For horizontal gestures, also check x distance
    const tipToWristX = Math.abs(fingerTip.x - wrist.x);
    const baseToWristX = Math.abs(fingerBase.x - wrist.x);
    
    // A finger is extended if the tip is higher (lower y value) than the base by some threshold
    // OR if the finger is significantly to the side
    return (tipToWristY < 0 && tipToWristY < baseToWristY - threshold) || 
           (tipToWristX > baseToWristX + threshold);
}

// Get stable gesture based on hand position (fallback mode)
function getStableGesture(landmarks) {
    // Get key landmarks for each finger
    const wrist = landmarks[0];
    
    // Thumb landmarks
    const thumbCmc = landmarks[1];
    const thumbMcp = landmarks[2];
    const thumbIp = landmarks[3];
    const thumbTip = landmarks[4];
    
    // Index finger landmarks
    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexDip = landmarks[7];
    const indexTip = landmarks[8];
    
    // Middle finger landmarks
    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleDip = landmarks[11];
    const middleTip = landmarks[12];
    
    // Ring finger landmarks
    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringDip = landmarks[15];
    const ringTip = landmarks[16];
    
    // Pinky finger landmarks
    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyDip = landmarks[19];
    const pinkyTip = landmarks[20];
    
    // More accurate finger extension detection
    // Consider a finger "extended" if it's straight and pointing away from the palm
    
    // Thumb needs special handling because of its orientation
    const thumbExtended = (thumbTip.x < wrist.x - 0.08) || 
                          (Math.abs(thumbTip.y - thumbMcp.y) > 0.15);
    
    // For other fingers, check if they're extended relative to the palm
    const indexExtended = isFingerExtended(indexTip, indexMcp, wrist);
    const middleExtended = isFingerExtended(middleTip, middleMcp, wrist);
    const ringExtended = isFingerExtended(ringTip, ringMcp, wrist);
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyMcp, wrist);
    
    // Create a binary string representing finger states
    const fingerState = `${thumbExtended?1:0}${indexExtended?1:0}${middleExtended?1:0}${ringExtended?1:0}${pinkyExtended?1:0}`;
    
    // Log the detected finger state for debugging
    console.log(`Finger state: ${fingerState}`);
    
    // Map specific finger configurations to gestures
    switch(fingerState) {
        case '01000': // Index finger up only
            // Double-check it's really Hello by verifying other fingers are clearly down
            const indexIsHighest = (
                indexTip.y < middleTip.y - 0.1 && 
                indexTip.y < ringTip.y - 0.1 && 
                indexTip.y < pinkyTip.y - 0.1
            );
            return indexIsHighest ? "Hello" : "Unknown";
            
        case '01100': // Index and middle up (peace sign)
            return "Yes";
            
        case '11111': // All fingers up (open palm)
            return "Good";
            
        case '01110': // Three middle fingers up
            return "Thank You";  
            
        case '00000': // Fist - all fingers closed
            // Verify all fingers are actually curled
            const allFingersCurled = (
                Math.max(indexTip.y, middleTip.y, ringTip.y, pinkyTip.y) > wrist.y - 0.2
            );
            return allFingersCurled ? "No" : "Unknown";
            
        case '10001': // Thumb and pinky extended
            return "Name";
            
        case '01111': // Four fingers except thumb
            return "Help";
            
        case '11000': // Thumb and index
            // Check if thumb and index are close together
            const thumbIndexClose = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) + 
                Math.pow(thumbTip.y - indexTip.y, 2)
            ) < 0.1;
            
            return thumbIndexClose ? "Bad" : "Unknown";
            
        case '11110': // All except pinky
            return "Please";
            
        case '10000': // Thumb only
            // Verify thumb is clearly extended and other fingers are curled
            const thumbClearlyExtended = (
                thumbTip.x < wrist.x - 0.1 &&
                Math.max(indexTip.y, middleTip.y, ringTip.y, pinkyTip.y) > wrist.y - 0.2
            );
            return thumbClearlyExtended ? "Sorry" : "Unknown";
            
        default:
            // Additional checks for common gestures
            const fingerPositions = {
                thumbAndIndexClose: Math.sqrt(
                    Math.pow(thumbTip.x - indexTip.x, 2) + 
                    Math.pow(thumbTip.y - indexTip.y, 2)
                ) < 0.1
            };
            
            if (fingerState === '11100' || fingerState === '11101') return "Bad";
            if (fingerState === '01110' || fingerState === '01111') return "Thank You";
            if (fingerState === '11110' || fingerState === '11111') return "Good";
            if (fingerPositions.thumbAndIndexClose) return "Bad";
            
            // Fallback: Return unknown instead of using position-based fallback
            return "Unknown";
    }
}

// Process landmarks for model input (converting landmarks to image format)
function preprocessLandmarks(landmarks) {
    // Create a canvas to draw the hand landmarks
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 64;  // Match the size used during training
    offscreenCanvas.height = 64;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    
    // Fill with black background
    offscreenCtx.fillStyle = 'black';
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Normalize landmarks to fit canvas better (add padding and scaling)
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    
    // Find bounding box of hand
    for (const landmark of landmarks) {
        minX = Math.min(minX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxX = Math.max(maxX, landmark.x);
        maxY = Math.max(maxY, landmark.y);
    }
    
    // Add padding
    const padding = 0.05;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(1, maxX + padding);
    maxY = Math.min(1, maxY + padding);
    
    // Calculate scale to normalize the hand size
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min(
        (offscreenCanvas.width - 10) / (width * offscreenCanvas.width),
        (offscreenCanvas.height - 10) / (height * offscreenCanvas.height)
    );
    
    // Center the hand on the canvas
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Draw the hand landmarks as white dots
    offscreenCtx.fillStyle = 'white';
    const transformedLandmarks = landmarks.map(landmark => {
        // Apply scaling and centering
        const x = ((landmark.x - centerX) * scale + 0.5) * offscreenCanvas.width;
        const y = ((landmark.y - centerY) * scale + 0.5) * offscreenCanvas.height;
        return { x, y };
    });
    
    // Draw landmarks
    for (const landmark of transformedLandmarks) {
        offscreenCtx.beginPath();
        offscreenCtx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
        offscreenCtx.fill();
    }
    
    // Draw connections between landmarks
    offscreenCtx.strokeStyle = 'white';
    offscreenCtx.lineWidth = 1;
    
    // Define connections between landmarks (similar to HAND_CONNECTIONS)
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],  // Index finger
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle finger
        [0, 13], [13, 14], [14, 15], [15, 16],  // Ring finger
        [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
        [0, 5], [5, 9], [9, 13], [13, 17]  // Palm connections
    ];
    
    for (const [i, j] of connections) {
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(transformedLandmarks[i].x, transformedLandmarks[i].y);
        offscreenCtx.lineTo(transformedLandmarks[j].x, transformedLandmarks[j].y);
        offscreenCtx.stroke();
    }
    
    // Debug: Show the processed image on a visible canvas
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = offscreenCanvas.width;
    debugCanvas.height = offscreenCanvas.height;
    debugCanvas.style.position = 'absolute';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.border = '1px solid white';
    debugCanvas.style.zIndex = '1000';
    debugCanvas.getContext('2d').drawImage(offscreenCanvas, 0, 0);
    
    // Remove previous debug canvas if exists
    const existingDebug = document.getElementById('debug-canvas');
    if (existingDebug) {
        existingDebug.remove();
    }
    
    // Add to document for debugging
    debugCanvas.id = 'debug-canvas';
    document.body.appendChild(debugCanvas);
    
    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Convert to RGB with proper shape for PyTorch model
    // Our model expects [batch, channels, height, width] format
    const rgbData = new Float32Array(3 * 64 * 64);
    
    for (let i = 0; i < imageData.data.length / 4; i++) {
        const r = imageData.data[i * 4] / 255;  // Red
        const g = imageData.data[i * 4 + 1] / 255;  // Green
        const b = imageData.data[i * 4 + 2] / 255;  // Blue
        
        // Convert to PyTorch format [C, H, W] = [3, 64, 64]
        const y = Math.floor(i / 64);
        const x = i % 64;
        
        rgbData[0 * 64 * 64 + y * 64 + x] = r;  // R channel
        rgbData[1 * 64 * 64 + y * 64 + x] = g;  // G channel
        rgbData[2 * 64 * 64 + y * 64 + x] = b;  // B channel
    }
    
    // Convert to tensor with shape [1, 3, 64, 64]
    const tensor = tf.tensor(rgbData, [1, 3, 64, 64]);
    return tensor;
}

// Apply majority voting for stable recognition with longer history
function getConsensusGesture(newGesture) {
    // Add new gesture to history (keep last 15 for stability)
    gestureHistory.push(newGesture);
    if (gestureHistory.length > 15) {
        gestureHistory.shift();
    }
    
    // Count occurrences of each gesture
    gestureCounter = {};
    for (const gesture of gestureHistory) {
        if (!gestureCounter[gesture]) {
            gestureCounter[gesture] = 0;
        }
        gestureCounter[gesture]++;
    }
    
    // Find the most frequent gesture, ignoring "Unknown"
    let maxCount = 0;
    let consensus = newGesture;
    
    for (const gesture in gestureCounter) {
        // Skip "Unknown" gestures for consensus unless that's all we have
        if (gesture === "Unknown" && Object.keys(gestureCounter).length > 1) {
            continue;
        }
        
        if (gestureCounter[gesture] > maxCount) {
            maxCount = gestureCounter[gesture];
            consensus = gesture;
        }
    }
    
    // Calculate confidence based on consensus strength
    const confidence = maxCount / gestureHistory.length;
    
    // If confidence is too low, return "Unknown"
    if (confidence < 0.4 && consensus !== "Unknown") {
        return {
            gesture: "Unknown",
            confidence: 0.0
        };
    }
    
    return {
        gesture: consensus,
        confidence: confidence * 0.3 + 0.7 // Remap to 70-100% range
    };
}

// Handle MediaPipe hand detection results
function onHandResults(results) {
    if (!canvas || !ctx) return;  // Exit if canvas not ready

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the video frame
    ctx.save();
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Draw hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 2
            });
            drawLandmarks(ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 1
            });
        }
        
        // Get current time
        const now = Date.now();
        
        // Update gestures consistently
        if (now - lastUpdateTime > 100) {
            let newGesture;
            let confidence = 0.8;
            let sourceType = "";
            
            // Get rule-based prediction first
            const rulePrediction = getStableGesture(results.multiHandLandmarks[0]);
            
            if (!usingFallbackMode && model) {
                try {
                    // Try to use the CNN model
                    // Preprocess landmarks for model input
                    const inputTensor = preprocessLandmarks(results.multiHandLandmarks[0]);
                    
                    // Get prediction from the model
                    const predictions = model.predict(inputTensor);
                    const predictionArray = predictions.dataSync();
                    
                    // Get the index of the highest prediction
                    const predictedClass = predictionArray.indexOf(Math.max(...predictionArray));
                    confidence = predictionArray[predictedClass];
                    
                    // Get the gesture name from the mapping
                    const modelPrediction = gestureMapping[predictedClass.toString()] || "Unknown";
                    
                    // If the model has high confidence, use its prediction
                    // Otherwise, consider the rule-based prediction
                    if (confidence > 0.6) {
                        newGesture = modelPrediction;
                        sourceType = "AI";
                    } else if (rulePrediction !== "Unknown") {
                        newGesture = rulePrediction;
                        sourceType = "Hybrid";
                    } else {
                        newGesture = modelPrediction;
                        sourceType = "AI (low confidence)";
                    }
                    
                    // Clean up tensor to prevent memory leaks
                    inputTensor.dispose();
                    predictions.dispose();
                    
                    console.log(`Model: ${modelPrediction}, Rule: ${rulePrediction}, Selected: ${newGesture} (${sourceType})`);
                    
                } catch (error) {
                    console.error('Error during prediction, falling back to rule-based:', error);
                    newGesture = rulePrediction;
                    sourceType = "Rule (fallback)";
                    usingFallbackMode = true;
                }
            } else {
                // Use rule-based approach as fallback
                newGesture = rulePrediction;
                sourceType = "Rule";
            }
            
            // Apply consensus to stabilize gesture
            const result = getConsensusGesture(newGesture);
            
            // Only update if we have sufficient history (for initial stability)
            if (gestureHistory.length >= 10) {
                // Update display if confidence is high enough and we've had stable detection
                if (result.confidence > 0.8) {
                    if (result.gesture !== stableGesture) {
                        // If this is a new gesture, check if it's stable enough to switch
                        if (gestureCounter[result.gesture] >= 10) { // Require at least 10 frames of consistency
                            stableGesture = result.gesture;
                            stableConfidence = result.confidence;
                            gestureText.textContent = `${stableGesture} (${(result.confidence * 100).toFixed(1)}%) [${sourceType}]`;
                            console.log(`Stable gesture: ${stableGesture} with confidence ${(result.confidence * 100).toFixed(1)}%`);
                        }
                    } else if (result.confidence > stableConfidence) {
                        // Same gesture but higher confidence
                        stableConfidence = result.confidence;
                        gestureText.textContent = `${stableGesture} (${(result.confidence * 100).toFixed(1)}%) [${sourceType}]`;
                    }
                }
            } else if (gestureHistory.length === 10) {
                // Initial display after collecting enough data
                stableGesture = result.gesture;
                stableConfidence = result.confidence;
                gestureText.textContent = `${stableGesture} (${(result.confidence * 100).toFixed(1)}%) [${sourceType}]`;
            }
            
            lastUpdateTime = now;
        }
    } else {
        // No hand detected
        gestureText.textContent = 'No hand detected';
        stableGesture = '';
        stableConfidence = 0;
        gestureHistory = [];
        gestureCounter = {};
        lastUpdateTime = 0;
        
        // Remove debug canvas when no hand is detected
        const debugCanvas = document.getElementById('debug-canvas');
        if (debugCanvas) {
            debugCanvas.remove();
        }
    }
    
    ctx.restore();
}

// Load the model and gesture mapping
async function loadModel() {
    try {
        console.log("Loading gesture mapping...");
        // Load gesture mapping (with fallback)
        try {
            const gestureResponse = await fetch('/gesture_mapping.json');
            if (gestureResponse.ok) {
                gestureMapping = await gestureResponse.json();
                console.log("Gesture mapping loaded:", gestureMapping);
            } else {
                throw new Error('Failed to load gesture mapping');
            }
        } catch (err) {
            console.warn("Could not load gesture mapping, using fallback:", err);
            // Create a default gesture mapping if the file is not found
            gestureMapping = {
                "0": "Bad",
                "1": "Good",
                "2": "Hello",
                "3": "Help",
                "4": "Name",
                "5": "No",
                "6": "Please",
                "7": "Sorry",
                "8": "Thank You",
                "9": "Yes"
            };
            console.log("Using fallback gesture mapping:", gestureMapping);
        }
        
        console.log("Loading model configuration...");
        // Load model configuration
        try {
            const modelResponse = await fetch('/model.json');
            if (!modelResponse.ok) {
                throw new Error('Failed to load model configuration');
            }
            
            const modelConfig = await modelResponse.json();
            console.log("Model configuration loaded successfully");
            
            // Create a sequential model in TensorFlow.js
            model = tf.sequential();
            console.log("Created TensorFlow sequential model");
            
            // Process the layers from the configuration
            for (const layer of modelConfig.modelTopology.layers) {
                console.log(`Adding layer: ${layer.class_name}`);
                
                // Translate PyTorch layer types to TensorFlow.js layer types
                switch(layer.class_name) {
                    case "Conv2d":
                        const filters = layer.config.filters || 32;
                        const kernelSize = layer.config.kernel_size || [3, 3];
                        const strides = layer.config.strides || [1, 1];
                        const padding = layer.config.padding || 'valid';
                        
                        model.add(tf.layers.conv2d({
                            inputShape: [64, 64, 3],  // [height, width, channels]
                            filters: filters,
                            kernelSize: kernelSize,
                            strides: strides,
                            padding: padding,
                            activation: 'relu'
                        }));
                        console.log(`Added Conv2d layer: filters=${filters}, kernelSize=${kernelSize}`);
                        break;
                        
                    case "MaxPool2d":
                        const poolSize = layer.config.pool_size || [2, 2];
                        model.add(tf.layers.maxPooling2d({
                            poolSize: poolSize
                        }));
                        break;
                        
                    case "Flatten":
                        model.add(tf.layers.flatten());
                        break;
                        
                    case "Linear":
                    case "Dense":
                        const units = layer.config.units || 128;
                        const activation = layer.config.activation || 
                            (layer === modelConfig.modelTopology.layers[modelConfig.modelTopology.layers.length - 1] ? 
                             'softmax' : 'relu');
                        
                        model.add(tf.layers.dense({
                            units: units,
                            activation: activation
                        }));
                        break;
                        
                    default:
                        console.warn(`Unsupported layer type: ${layer.class_name}`);
                }
            }
            
            console.log("Compiling model...");
            model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            console.log("Model created and compiled successfully");
            usingFallbackMode = false;
            return true;
            
        } catch (err) {
            console.error("Error loading model:", err);
            // Fall back to rule-based recognition
            usingFallbackMode = true;
            console.log("Falling back to rule-based recognition");
            gestureText.textContent = "Using rule-based recognition";
            return true; // Still return true since we can use fallback mode
        }
        
    } catch (err) {
        console.error("Error in loadModel:", err);
        return false;
    }
}

// Text-to-Speech function
function speakText() {
    const text = gestureText.textContent.split('(')[0].trim();
    if (text && text !== 'No hand detected' && text !== 'Initializing...' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';  // Set to Indian English
        window.speechSynthesis.speak(utterance);
    }
}

// Initialize everything when page loads
async function init() {
    try {
        console.log("Initializing...");
        gestureText.textContent = 'Initializing...';
        
        // Set canvas size
        function resizeCanvas() {
            if (video && canvas) {
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
            }
        }
        
        // Resize canvas when video loads
        video.addEventListener('loadedmetadata', resizeCanvas);
        // Resize canvas when window resizes
        window.addEventListener('resize', resizeCanvas);
        
        // Load model first
        const modelLoaded = await loadModel();
        if (!modelLoaded) {
            console.error('Failed to load model and fallback');
            gestureText.textContent = 'Failed to initialize. Please refresh and try again.';
            return;
        }
        
        // Initialize hand detection with retry
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const { hands, camera } = await initializeHandDetection();
                
                // Handle visibility change
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        camera.stop();
                    } else {
                        camera.start();
                    }
                });
                
                console.log("Initialization complete");
                if (!usingFallbackMode) {
                    gestureText.textContent = 'Ready! Show your hand...';
                }
                return;
            } catch (error) {
                retryCount++;
                console.error(`Initialization attempt ${retryCount} failed:`, error);
                if (retryCount === maxRetries) {
                    gestureText.textContent = 'Failed to initialize camera after multiple attempts. Please refresh the page.';
                    return;
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Initialization error:', error);
        if (gestureText) {
            gestureText.textContent = 'Error initializing. Please refresh and try again.';
        }
    }
}

// Start everything when page loads
window.onload = init;
