// src/amplifyClient.js
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

// Configure Amplify exactly once, at module load
Amplify.configure(outputs);

// Export a shared data client
export const client = generateClient();
