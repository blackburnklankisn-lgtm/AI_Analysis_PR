import re
import os
from collections import deque
from typing import List, Set

class LogProcessor:
    def __init__(self, keywords: List[str] = None):
        if keywords is None:
            self.keywords = ["Error", "Fail", "Timeout", "Reset", "DTC"]
        else:
            self.keywords = keywords
        
        # Compile regex for optimization
        pattern_str = "|".join([rf"{kw}" for kw in self.keywords])
        self.pattern = re.compile(pattern_str, re.IGNORECASE)

    def process_log(self, file_path: str, context_lines: int = 20) -> str:
        """
        Processes a large log file and extracts context around keywords.
        Uses a sliding window (deque) to maintain previous lines and 
        look-ahead to capture subsequent lines.
        """
        if not os.path.exists(file_path):
            return "Log file not found."

        snippets = []
        before_buffer = deque(maxlen=context_lines)
        after_count = 0
        current_snippet = []

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if self.pattern.search(line):
                        # If we find a keyword, start a new snippet or extend current
                        if not current_snippet:
                            current_snippet.extend(list(before_buffer))
                        
                        current_snippet.append(f"-> {line.strip()}")
                        after_count = context_lines  # Count lines to capture after match
                    
                    elif after_count > 0:
                        current_snippet.append(line.strip())
                        after_count -= 1
                        if after_count == 0:
                            snippets.append("\n".join(current_snippet))
                            snippets.append("-" * 40)
                            current_snippet = []
                    
                    else:
                        before_buffer.append(line.strip())

                # If the file ends while still capturing 'after' lines
                if current_snippet:
                    snippets.append("\n".join(current_snippet))

            return "\n".join(snippets) if snippets else "No critical patterns found in log."

        except Exception as e:
            return f"Error processing log file: {e}"

    @staticmethod
    def optimize_regex_demo():
        """
        Example of an optimized regex strategy for automotive logs.
        Includes hex codes for CAN errors or specific DTC formats.
        """
        # Example patterns: 
        # DTC: [U|P|C|B]\d{4}-\d{2}
        # CAN Timeout: [A-Z_]+_TIMEOUT
        patterns = [
            r"(?i)error|fail|timeout|reset|dtc",  # Standard keywords
            r"[U|P|C|B]\d{4}-\d{2}",             # Standard OBD-II DTCs
            r"0x[0-9A-Fa-f]{2,8}",               # Hex codes (often memory addresses or error codes)
            r"CAN\s?Error",                       # CAN bus specific
            r"Critical|Fatal"                    # Severity levels
        ]
        return "|".join(patterns)

if __name__ == "__main__":
    # Test with a snippet
    processor = LogProcessor()
    # Mock log processing logic here if needed
    pass
