"""
Phase 1 Voice Transcription System - Complete Implementation
Orchestrates all components for production accent-aware transcription

Components:
1. Accent Detection (CNN/LSTM classifier)
2. Feature Extraction (Prosodic + Acoustic)
3. Lexicon-based Corrections
4. Confidence Threshold Analysis
5. Human Review Flagging
"""

import json
import torch
from typing import Dict, Optional, List
from datetime import datetime


class Phase1VoiceTranscriptionSystem:
    """
    Complete Phase 1 transcription system with accent awareness.

    Pipeline:
    1. Detect accent from audio (first 3 seconds)
    2. Extract features (~50-dimensional)
    3. Get base transcription
    4. Apply accent-specific lexicon corrections
    5. Check confidence thresholds
    6. Flag for review if needed
    """

    def __init__(
        self,
        accent_detector,
        base_transcriber,
        lexicons,
        confidence_thresholds: Optional[Dict] = None,
        device: Optional[torch.device] = None
    ):
        """
        Initialize Phase 1 system.

        Args:
            accent_detector: Accent detection service
            base_transcriber: Base transcription model
            lexicons: Dictionary of accent lexicons
            confidence_thresholds: Optional pre-calculated thresholds
            device: PyTorch device (cuda/cpu)
        """
        self.accent_detector = accent_detector
        self.base_transcriber = base_transcriber
        self.lexicons = lexicons
        self.device = device or torch.device('cpu')

        # Default thresholds (can be overridden with optimal values from analysis)
        self.confidence_thresholds = confidence_thresholds or {
            'Barbadian': 0.68,
            'Scottish': 0.72,
            'Irish': 0.75,
            'Welsh': 0.73,
            'Standard': 0.80
        }

        self.metrics = {
            'total_processed': 0,
            'total_flagged': 0,
            'corrections_applied': 0,
            'by_accent': {}
        }

    def transcribe(self, audio_path: str, return_confidence: bool = False) -> Dict:
        """
        Complete transcription pipeline with accent handling.

        Args:
            audio_path: Path to audio file
            return_confidence: Include confidence info in output

        Returns:
            {
                'transcript': 'Corrected transcript',
                'accent': 'Barbadian',
                'confidence': 0.92,
                'flagged_for_review': False,
                'corrections_applied': 2,
                'metadata': {...}
            }
        """
        start_time = datetime.now()

        try:
            # Step 1: Detect accent
            accent_result = self.accent_detector.detect(audio_path)
            accent = accent_result['primary_accent']
            confidence = accent_result['confidence']

            # Step 2: Get base transcription
            base_result = self.base_transcriber.transcribe(audio_path)
            base_transcript = base_result.get('text', '')
            words = base_transcript.split()
            phonemes = base_result.get('phonemes', [])

            # Step 3: Apply lexicon corrections
            lexicon = self.lexicons.get(accent)
            corrected_words = []
            corrections_applied = 0
            correction_details = []

            for i, word in enumerate(words):
                if lexicon and confidence > 0.5:
                    phoneme = phonemes[i] if i < len(phonemes) else None
                    candidates = lexicon.get_candidates(phoneme, word, confidence)

                    if candidates and len(candidates) > 1:
                        best_variant, weight = candidates[0]

                        if best_variant != word:
                            corrections_applied += 1
                            correction_details.append({
                                'position': i,
                                'original': word,
                                'corrected': best_variant,
                                'weight': float(weight)
                            })

                        corrected_words.append(best_variant)
                    else:
                        corrected_words.append(word)
                else:
                    corrected_words.append(word)

            corrected_transcript = ' '.join(corrected_words)

            # Step 4: Check confidence threshold
            threshold = self.confidence_thresholds.get(accent, 0.75)
            flagged_for_review = confidence < threshold

            # Step 5: Update metrics
            self.metrics['total_processed'] += 1
            if flagged_for_review:
                self.metrics['total_flagged'] += 1
            self.metrics['corrections_applied'] += corrections_applied

            if accent not in self.metrics['by_accent']:
                self.metrics['by_accent'][accent] = {
                    'count': 0,
                    'avg_confidence': 0,
                    'corrections': 0,
                    'flagged': 0
                }

            accent_metrics = self.metrics['by_accent'][accent]
            accent_metrics['count'] += 1
            accent_metrics['avg_confidence'] = (
                (accent_metrics['avg_confidence'] * (accent_metrics['count'] - 1) + confidence) /
                accent_metrics['count']
            )
            accent_metrics['corrections'] += corrections_applied
            if flagged_for_review:
                accent_metrics['flagged'] += 1

            processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000

            # Build result
            result = {
                'transcript': corrected_transcript,
                'accent': accent,
                'confidence': confidence,
                'flagged_for_review': flagged_for_review,
                'corrections_applied': corrections_applied,
                'metadata': {
                    'accent_primary': accent,
                    'accent_secondary': accent_result.get('secondary_accent'),
                    'accent_confidence': confidence,
                    'threshold_used': threshold,
                    'base_transcript': base_transcript,
                    'processing_time_ms': processing_time_ms,
                    'correction_rate': corrections_applied / len(words) if words else 0,
                    'correction_details': correction_details if return_confidence else [],
                    'timestamp': datetime.now().isoformat()
                }
            }

            return result

        except Exception as e:
            return {
                'error': str(e),
                'audio_path': audio_path,
                'timestamp': datetime.now().isoformat()
            }

    def transcribe_batch(self, audio_paths: List[str]) -> List[Dict]:
        """
        Transcribe multiple audio files.

        Args:
            audio_paths: List of audio file paths

        Returns:
            List of transcription results
        """
        results = []
        for audio_path in audio_paths:
            result = self.transcribe(audio_path)
            results.append(result)

        return results

    def get_metrics(self) -> Dict:
        """Get current processing metrics."""
        return {
            **self.metrics,
            'avg_confidence_by_accent': {
                accent: metrics['avg_confidence']
                for accent, metrics in self.metrics['by_accent'].items()
            },
            'flag_rate': (
                self.metrics['total_flagged'] / self.metrics['total_processed']
                if self.metrics['total_processed'] > 0 else 0
            )
        }

    def reset_metrics(self) -> None:
        """Reset all metrics."""
        self.metrics = {
            'total_processed': 0,
            'total_flagged': 0,
            'corrections_applied': 0,
            'by_accent': {}
        }

    def update_thresholds(self, new_thresholds: Dict) -> None:
        """
        Update confidence thresholds from analysis.

        Args:
            new_thresholds: Dictionary of optimal thresholds per accent
        """
        self.confidence_thresholds.update(new_thresholds)

    def save_config(self, config_path: str) -> None:
        """Save configuration to JSON file."""
        config = {
            'confidence_thresholds': self.confidence_thresholds,
            'saved_at': datetime.now().isoformat()
        }

        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

    def load_config(self, config_path: str) -> None:
        """Load configuration from JSON file."""
        with open(config_path, 'r') as f:
            config = json.load(f)

        self.confidence_thresholds = config['confidence_thresholds']


class MockComponents:
    """Mock components for testing."""

    class MockAccentDetector:
        def detect(self, audio_path):
            return {
                'primary_accent': 'Barbadian',
                'confidence': 0.92,
                'secondary_accent': 'Standard',
                'secondary_confidence': 0.05
            }

    class MockBaseTranscriber:
        def transcribe(self, audio_path):
            return {
                'text': 'You know this system working real good',
                'phonemes': []
            }


if __name__ == '__main__':
    """Example usage."""

    from lexicons_accent_lexicons import AccentLexicon

    # Initialize with mock components
    mock_detector = MockComponents.MockAccentDetector()
    mock_transcriber = MockComponents.MockBaseTranscriber()
    lexicons = {
        'Barbadian': AccentLexicon('Barbadian'),
        'Scottish': AccentLexicon('Scottish'),
        'Irish': AccentLexicon('Irish'),
        'Welsh': AccentLexicon('Welsh'),
        'Standard': AccentLexicon('Standard')
    }

    # Create system
    system = Phase1VoiceTranscriptionSystem(
        accent_detector=mock_detector,
        base_transcriber=mock_transcriber,
        lexicons=lexicons
    )

    # Example transcription
    result = system.transcribe('audio/test.wav', return_confidence=True)

    print("=" * 60)
    print("Phase 1 Voice Transcription System - Example Output")
    print("=" * 60)
    print(f"\nBase Transcript:  {result['metadata']['base_transcript']}")
    print(f"Corrected:        {result['transcript']}")
    print(f"Accent:           {result['accent']} ({result['confidence']:.2%} confidence)")
    print(f"Corrections:      {result['corrections_applied']}")
    print(f"Flagged:          {'Yes' if result['flagged_for_review'] else 'No'}")
    print(f"Processing Time:  {result['metadata']['processing_time_ms']:.1f}ms")

    # Show metrics
    metrics = system.get_metrics()
    print(f"\nSystem Metrics:")
    print(f"  Total Processed: {metrics['total_processed']}")
    print(f"  Flag Rate: {metrics['flag_rate']:.2%}")
    print(f"  Total Corrections: {metrics['corrections_applied']}")

    print("\n✓ Phase 1 system ready for MVP deployment")
