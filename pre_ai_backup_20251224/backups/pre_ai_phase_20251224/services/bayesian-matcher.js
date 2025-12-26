/**
 * AutoBookkeeping V4 - Bayesian Account Matcher
 * Adapted from banks2ledger Bayesian inference
 * 
 * Uses Naive Bayes classification to predict accounts based on:
 * - Transaction description (tokenized features)
 * - Historical user corrections
 * - Amount patterns
 * 
 * Gets smarter with every correction!
 */

(function () {
    'use strict';

    class BayesianMatcher {
        constructor() {
            this.trainingData = [];
            this.loaded = false;
        }

        /**
         * Load training data from Supabase
         */
        async loadTrainingData() {
            try {
                const { data, error } = await supabase
                    .from('ai_training_data')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1000);

                if (error) throw error;

                this.trainingData = data || [];
                this.loaded = true;

                console.log(`🧠 Loaded ${this.trainingData.length} training examples`);
            } catch (error) {
                console.error('Failed to load training data:', error);
                this.trainingData = [];
                this.loaded = false;
            }
        }

        /**
         * Predict account for a transaction
         * Returns: { accountId, confidence, alternatives }
         */
        async predictAccount(transaction) {
            // Ensure training data is loaded
            if (!this.loaded) {
                await this.loadTrainingData();
            }

            // If no training data, return null
            if (this.trainingData.length === 0) {
                return {
                    accountId: null,
                    confidence: 0,
                    alternatives: []
                };
            }

            const { description, amount } = transaction;

            // Extract features from description
            const features = this.extractFeatures(description);

            // Get all unique accounts
            const accounts = this.getUniqueAccounts();

            // Calculate probability for each account
            const probabilities = {};
            for (const accountId of accounts) {
                probabilities[accountId] = this.calculateProbability(features, amount, accountId);
            }

            // Get best match
            const sorted = Object.entries(probabilities)
                .sort((a, b) => b[1] - a[1]);

            const bestAccount = sorted[0];
            const alternatives = sorted.slice(1, 4).map(([id, prob]) => ({
                accountId: id,
                probability: prob
            }));

            return {
                accountId: bestAccount ? bestAccount[0] : null,
                confidence: bestAccount ? bestAccount[1] : 0,
                alternatives
            };
        }

        /**
         * Extract features from transaction description
         * Tokenize, normalize, remove stop words
         */
        extractFeatures(description) {
            // Normalize
            const normalized = description
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Tokenize
            const words = normalized.split(' ');

            // Remove stop words
            const stopWords = new Set([
                'the', 'and', 'for', 'with', 'from', 'to', 'in', 'on', 'at',
                'by', 'of', 'a', 'an', 'is', 'was', 'are', 'were'
            ]);

            // Filter and deduplicate
            const features = [...new Set(
                words.filter(w => w.length > 2 && !stopWords.has(w))
            )];

            return features;
        }

        /**
         * Calculate probability using Naive Bayes
         * P(Account|Features,Amount) ∝ P(Features,Amount|Account) * P(Account)
         */
        calculateProbability(features, amount, accountId) {
            // Prior: P(Account)
            const prior = this.calculatePrior(accountId);

            // Likelihood: P(Features|Account)
            const featureLikelihood = this.calculateFeatureLikelihood(features, accountId);

            // Likelihood: P(Amount|Account)
            const amountLikelihood = this.calculateAmountLikelihood(amount, accountId);

            // Combined probability (log space to avoid underflow)
            const logProb = Math.log(prior) +
                Math.log(featureLikelihood) +
                Math.log(amountLikelihood);

            return Math.exp(logProb);
        }

        /**
         * Calculate prior probability P(Account)
         * How often this account is used overall
         */
        calculatePrior(accountId) {
            const accountCount = this.trainingData.filter(
                t => t.user_selected_account === accountId
            ).length;

            // Laplace smoothing
            return (accountCount + 1) / (this.trainingData.length + this.getUniqueAccounts().length);
        }

        /**
         * Calculate feature likelihood P(Features|Account)
         * How often these words appear with this account
         */
        calculateFeatureLikelihood(features, accountId) {
            const accountData = this.trainingData.filter(
                t => t.user_selected_account === accountId
            );

            if (accountData.length === 0) return 0.01; // Smoothing

            let score = 1.0;
            for (const feature of features) {
                const featureCount = accountData.filter(
                    t => t.raw_description && t.raw_description.toLowerCase().includes(feature)
                ).length;

                // Laplace smoothing: (count + 1) / (total + 2)
                const probability = (featureCount + 1) / (accountData.length + 2);
                score *= probability;
            }

            return score;
        }

        /**
         * Calculate amount likelihood P(Amount|Account)
         * Based on amount range patterns
         */
        calculateAmountLikelihood(amount, accountId) {
            const accountData = this.trainingData.filter(
                t => t.user_selected_account === accountId
            );

            if (accountData.length === 0) return 0.5;

            // Calculate mean and std dev of amounts for this account
            const amounts = accountData.map(t => Math.abs(t.amount || 0));
            const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);

            // Gaussian probability
            const absAmount = Math.abs(amount);
            const exponent = -Math.pow(absAmount - mean, 2) / (2 * Math.pow(stdDev, 2));
            const probability = Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI));

            // Normalize to [0.1, 1.0] range
            return Math.max(0.1, Math.min(1.0, probability * 10));
        }

        /**
         * Get unique account IDs from training data
         */
        getUniqueAccounts() {
            return [...new Set(
                this.trainingData
                    .map(t => t.user_selected_account)
                    .filter(Boolean)
            )];
        }

        /**
         * Record user correction for learning
         * This is how the system gets smarter!
         */
        async recordCorrection(transaction, aiPrediction, userSelection) {
            try {
                const { error } = await supabase
                    .from('ai_training_data')
                    .insert([{
                        raw_description: transaction.description,
                        amount: transaction.amount,
                        ai_predicted_account: aiPrediction.accountId,
                        ai_confidence: aiPrediction.confidence,
                        user_selected_account: userSelection,
                        was_correct: aiPrediction.accountId === userSelection,
                        correction_type: 'account',
                        created_at: new Date().toISOString()
                    }]);

                if (error) throw error;

                console.log('✅ Correction recorded, reloading training data...');

                // Reload training data to include new correction
                await this.loadTrainingData();

                return true;
            } catch (error) {
                console.error('Failed to record correction:', error);
                return false;
            }
        }

        /**
         * Batch predict for multiple transactions
         */
        async batchPredict(transactions) {
            // Ensure training data is loaded
            if (!this.loaded) {
                await this.loadTrainingData();
            }

            const predictions = [];
            for (const txn of transactions) {
                const prediction = await this.predictAccount(txn);
                predictions.push({
                    ...txn,
                    suggestedAccount: prediction.accountId,
                    confidence: prediction.confidence,
                    alternatives: prediction.alternatives
                });
            }

            return predictions;
        }

        /**
         * Get accuracy stats
         */
        getAccuracyStats() {
            if (this.trainingData.length === 0) {
                return {
                    totalCorrections: 0,
                    correctPredictions: 0,
                    accuracy: 0
                };
            }

            const correctPredictions = this.trainingData.filter(t => t.was_correct).length;

            return {
                totalCorrections: this.trainingData.length,
                correctPredictions,
                accuracy: correctPredictions / this.trainingData.length
            };
        }
    }

    // Create singleton instance and expose globally
    window.bayesianMatcher = new BayesianMatcher();

    console.log('🧠 Bayesian Matcher loaded');

})(); // End IIFE
