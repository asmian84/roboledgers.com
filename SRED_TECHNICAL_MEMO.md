# 🇨🇦 SR&ED Technical Eligibility Memo
**Project:** Autonomous Client-Side Financial Document Reconstruction & Semantic Analysis System  
**Date:** 2026-01-30  
**Status:** In Development (Alpha)

## 🎯 Executive Summary
To qualify for the **Scientific Research and Experimental Development (SR&ED)** tax incentive in Canada, this project must demonstrate it is solving **Technological Uncertainties** through **Systematic Investigation** to achieve a **Technological Advancement**.

Based on the current architecture (`v4.2`), we can frame the claim around two core technical pillars:
1.  **Spatial Data Integrity in Browser-Based Environments** (The Visual Audit Engine).
2.  **Hybrid deterministic/probabilistic Classification Optimization** (The 7-Tier Engine).

---

## 🏛️ Pillar 1: Spatial Data Reconstruction (The "Visual Audit")

### 1. Technological Uncertainty
*   **The Problem:** Standard PDF extraction libraries (like `pdfjs-dist`) provide a "Text Layer" that is often strictly linear or disordered. It does not inherently preserve the *visual* relationships between data points (e.g., a "Debit" value visually aligned with a "Description" but technically separated in the data stream).
*   **The Challenge:** Reconstructing a rigid accounting ledger from unstructured, varying-layout PDF data *solely within the client-side browser context* (without heavy server-side OCR) is non-trivial. It requires mapping raw vector coordinates to a normalized grid.
*   **Why not standard practice?** Most solutions rely on server-side OCR (Textract/Document AI). Doing this purely client-side with high-fidelity visual verification (the "Zoom Lens" feature) required novel coordinate mapping logic.

### 2. Systematic Investigation (The Work)
*   **Hypothesis:** We can create a "Spatial Bridge" that links a parsed transaction row ID back to its exact bounding box on the rendered PDF canvas.
*   **Experimentation:**
    *   Testing varying render scales (viewport scaling vs. CSS scaling) in `v5-pdf-viewer.js`.
    *   Developing the `renderVisualAudit` function to perform real-time cropping and 2.5x magnification of specific coordinate sets.
    *   Handling multi-line text reflow where one logical transaction spans multiple visual text blocks (the "BMO vs. RBC" line-wrap problem).

### 3. Technological Advancement
*   **Outcome:** A proprietary client-side algorithm that allows for "pixel-perfect" audit trails of raw banking data.
*   **Evidence:** `src/pages/v5-pdf-viewer.js`, `src/services/parsers/*.js` (specifically the coordinate extraction logic).

---

## 🧠 Pillar 2: High-Performance Hybrid Categorization (The "7-Tier Brain")

### 1. Technological Uncertainty
*   **The Problem:** Financial categorization faces a trade-off: **Accuracy vs. Latency/Cost**.
    *   *Deterministic (Rules):* Fast, but brittle (fails on "Starbucks #123").
    *   *Probabilistic (LLMs):* Accurate, but slow (3s/txn) and expensive ($$).
*   **The Challenge:** Integrating complex pattern matching into a constrained browser environment (Single Thread JS) to achieve <100ms processing for thousands of rows *without* crashing the UI thread.

### 2. Systematic Investigation (The Work)
*   **Hypothesis:** A "Cascading 7-Tier Architecture" can filter 95% of transactions using low-cost local techniques, reserving high-cost AI for the edge cases.
*   **Experimentation:**
    *   **Tier 4 (Historical Patterning):** We implemented a custom fuzzy-pattern engine (`vendorMatcher.js`) that analyzes `description_patterns` (normalized string tokens) rather than raw equality.
    *   **Tier 2 (Levenshtein):** Tuned distance algorithms to prevent false positives (e.g., "Uber" vs "Uber Eats").
    *   **Performance Tuning:** Investigated chunking strategies in `ProcessingEngine.js` to prevent UI freezing during batch processing of 4000+ vendors.

### 3. Technological Advancement
*   **Outcome:** A generic, browser-based "Self-Learning" engine effectively democratizes Enterprise-grade ML categorization without server infrastructure.
*   **Evidence:** `src/services/processing-engine.js`, `src/utils/vendorMatcher.js`.

---

## 📝 Action Plan for Claiming

1.  **Log Failed Hypotheses:** (Crucial)
    *   Did we try a parser that failed? (Yes, the initial regex approach failed on multi-line dates).
    *   Did AI hallucinations cause issues? (Document the "Temperatur=0" tuning).
2.  **Commit History as Lab Notebook:**
    *   Ensure commit messages (like "Fix: coordinate offset in zoom render") act as proof of the investigative process.
3.  **Benchmark:**
    *   Document the "Before" (Manual Entry) vs. "After" (Automated Spatial Parsing).

### ⚠️ Disclaimer
*I am an AI, not a tax lawyer. This document formats your technical work into SR&ED language, but you must consult a qualified SR&ED consultant to file the claim.*
