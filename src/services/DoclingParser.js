import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Service to interface with the Python Docling bridge for advanced PDF parsing.
 */
export class DoclingParser {
    constructor() {
        // Hardcoded path to Python 3.11 (ARM64)
        this.pythonPath = 'C:\\Users\\asmia\\AppData\\Local\\Programs\\Python\\Python311-arm64\\python.exe';
        // Resolve path to the python script relative to this file
        // src/services/DoclingParser.js -> src/services/parsers/docling_bridge.py
        this.scriptPath = path.resolve(__dirname, 'parsers', 'docling_bridge.py');
    }

    /**
     * Checks if Python and Docling are available using a dry-run check.
     */
    async isAvailable() {
        return new Promise((resolve) => {
            const process = spawn(this.pythonPath, ['--version']);
            process.on('error', () => resolve(false));
            process.on('close', (code) => resolve(code === 0));
        });
    }

    /**
     * Parses a PDF file and extracts tables.
     * @param {string} filePath Absolute path to the PDF file
     * @returns {Promise<object>} structured result with tables
     */
    async parsePDF(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonPath, [this.scriptPath, filePath]);

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
                // Optionally log stderr for debugging, but don't fail immediately
                console.log(`[Docling Bridge Log]: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    // Try to parse error from stdout first (structural error), then stderr
                    try {
                        const jsonErr = JSON.parse(stdoutData);
                        return reject(new Error(jsonErr.message || jsonErr.error || 'Docling failed'));
                    } catch (e) {
                        return reject(new Error(`Docling process exited with code ${code}: ${stderrData}`));
                    }
                }

                try {
                    const result = JSON.parse(stdoutData);
                    if (result.error) {
                        return reject(new Error(result.message || result.error));
                    }
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse Docling output: ${e.message}\nRaw output: ${stdoutData.substring(0, 200)}...`));
                }
            });

            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to start Docling process: ${err.message}. Is Python installed?`));
            });
        });
    }
}

export const doclingParser = new DoclingParser();
