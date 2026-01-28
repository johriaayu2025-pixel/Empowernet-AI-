from ml.image_infer import analyze_image_base64
import unittest
from unittest.mock import patch, MagicMock

class TestScamImageDetection(unittest.TestCase):
    @patch('ml.image_infer.reader')
    @patch('ml.image_infer.analyze_text')
    def test_scam_image_categorization(self, mock_analyze_text, mock_reader):
        # Mock OCR finding scam text
        mock_reader.readtext.return_value = ["URGENT: WINNER!"]
        mock_analyze_text.return_value = {
            "category": "SCAM",
            "riskScore": 95,
            "userSummary": {"triggers": ["urgency"]}
        }
        
        # Dummy base64 (1x1 transparent png)
        dummy_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        result = analyze_image_base64(dummy_b64)
        
        print("Scam Image Result:", result['category'])
        self.assertEqual(result['category'], 'SCAM')
        self.assertGreaterEqual(result['confidence'], 0.85)
        print("✅ Scam Image Categorization Verified")

if __name__ == '__main__':
    unittest.main()
