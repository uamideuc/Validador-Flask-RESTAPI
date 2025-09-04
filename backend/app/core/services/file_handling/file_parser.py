"""
File Parser Service - Specialized in parsing different file formats
Single responsibility: Convert files to pandas DataFrames
"""
import pandas as pd
import os
from typing import Optional


class FileParser:
    """
    Specialized service for parsing files into pandas DataFrames
    Handles CSV, TXT, and Excel files with automatic detection
    """
    
    def parse_file(self, file_path: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """Parse file based on extension"""
        file_extension = file_path.lower().split('.')[-1]
        
        if file_extension in ['csv', 'txt']:
            return self._parse_csv(file_path)
        elif file_extension in ['xlsx', 'xls']:
            return self._parse_excel(file_path, sheet_name)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    def _parse_csv(self, file_path: str) -> pd.DataFrame:
        """Parse CSV/TXT file with automatic encoding and separator detection"""
        encodings_to_try = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        separators_to_try = [None, ',', ';', '\t', '|']  # None lets pandas infer
        
        for encoding in encodings_to_try:
            for sep in separators_to_try:
                try:
                    if sep is None:
                        # Let pandas infer the separator
                        df = pd.read_csv(file_path, encoding=encoding, sep=None, engine='python')
                    else:
                        df = pd.read_csv(file_path, encoding=encoding, sep=sep)
                    
                    # Validate that we got reasonable columns (at least 1 column with data)
                    if len(df.columns) >= 1 and len(df) > 0:
                        print(f"✅ CSV parsed successfully with encoding: {encoding}, separator: {sep or 'auto-detected'}")
                        
                        # If file was not UTF-8, convert and save it as UTF-8
                        if encoding != 'utf-8':
                            self._convert_file_to_utf8(file_path, encoding)
                            print(f"🔄 File converted from {encoding} to UTF-8")
                        
                        return df
                        
                except (UnicodeDecodeError, pd.errors.ParserError):
                    continue
                except Exception as e:
                    # Only raise on the last combination to try
                    if encoding == encodings_to_try[-1] and sep == separators_to_try[-1]:
                        raise Exception(f"Error parsing CSV/TXT: {str(e)}")
                    continue
        
        raise Exception("No se pudo determinar la codificación y separador del archivo")
    
    def _parse_excel(self, file_path: str, sheet_name: Optional[str] = None) -> pd.DataFrame:
        """Parse Excel file with optional sheet selection"""
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            print(f"✅ Excel parsed successfully from sheet: {sheet_name or 'default'}")
            return df
        except Exception as e:
            raise Exception(f"Error parsing Excel file: {str(e)}")
    
    def _convert_file_to_utf8(self, file_path: str, source_encoding: str) -> None:
        """Convert file from source encoding to UTF-8"""
        try:
            # Create backup path
            backup_path = f"{file_path}.backup"
            
            # Read file with source encoding
            with open(file_path, 'r', encoding=source_encoding) as source_file:
                content = source_file.read()
            
            # Create backup of original file
            with open(backup_path, 'w', encoding=source_encoding) as backup_file:
                backup_file.write(content)
            
            # Write file with UTF-8 encoding
            with open(file_path, 'w', encoding='utf-8') as target_file:
                target_file.write(content)
            
            # Remove backup if conversion successful
            os.remove(backup_path)
            
        except Exception as e:
            # If conversion fails, restore from backup if it exists
            backup_path = f"{file_path}.backup"
            if os.path.exists(backup_path):
                os.replace(backup_path, file_path)
            raise Exception(f"Error converting file to UTF-8: {str(e)}")