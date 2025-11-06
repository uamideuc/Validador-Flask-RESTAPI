"""
Data Cleaner Service - Specialized in cleaning and preprocessing data
Single responsibility: Clean and preprocess DataFrames
"""
import pandas as pd
from typing import Tuple, List, Dict, Any


class DataCleaner:
    """
    Specialized service for cleaning and preprocessing pandas DataFrames
    """
    
    def clean_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Apply all cleaning operations to a DataFrame
        Returns: (cleaned_df, cleaning_info)
        """
        cleaning_info = {}

        # Handle unnamed columns
        df, unnamed_info = self._handle_unnamed_columns(df)
        cleaning_info['unnamed_columns'] = unnamed_info

        # Identify empty columns (but preserve them)
        df, empty_columns_list = self._remove_empty_columns(df)
        cleaning_info['empty_columns_found'] = empty_columns_list
        cleaning_info['empty_columns_count'] = len(empty_columns_list)

        return df, cleaning_info
    
    def _handle_unnamed_columns(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Handle unnamed columns by giving them descriptive names
        """
        df_copy = df.copy()
        unnamed_columns_info = {
            'found_unnamed': False,
            'renamed_columns': [],
            'original_count': len(df_copy.columns)
        }
        
        # Find columns that are unnamed (typically start with 'Unnamed:')
        renamed_columns = []
        for i, col in enumerate(df_copy.columns):
            col_str = str(col)
            if col_str.startswith('Unnamed:') or col_str in ['', ' ', 'nan']:
                new_name = f"Sin_Nombre_{i+1}"
                df_copy = df_copy.rename(columns={col: new_name})
                renamed_columns.append({
                    'original': col_str,
                    'new_name': new_name,
                    'position': i+1
                })
        
        if renamed_columns:
            unnamed_columns_info['found_unnamed'] = True
            unnamed_columns_info['renamed_columns'] = renamed_columns
            print(f"🏷️  Renamed {len(renamed_columns)} unnamed columns")
        
        return df_copy, unnamed_columns_info
    
    def _remove_empty_columns(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Identify columns that are completely empty but DO NOT remove them.
        This preserves the original structure so users can see all columns.
        Returns: (DataFrame unchanged, list of empty column names)
        """
        df_copy = df.copy()
        empty_columns = []

        for col in df_copy.columns:
            # Get the column as string to handle mixed types
            col_series = df_copy[col].astype(str)

            # Check if column is completely empty or only contains whitespace/null indicators
            is_empty = col_series.isna().all() or \
                      col_series.isin(['', ' ', 'nan', 'None', 'null', 'NaN', 'NULL']).all() or \
                      col_series.str.strip().eq('').all()

            if is_empty:
                empty_columns.append(col)

        if empty_columns:
            print(f"⚠️  Found {len(empty_columns)} empty columns (preserved): {empty_columns}")

        # Return DataFrame unchanged with list of empty columns
        return df_copy, empty_columns