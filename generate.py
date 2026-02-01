#!/usr/bin/env python3
"""
Year Progress Image Generator
Generates a status image showing the current year's progress percentage.
"""

from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import os

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_IMAGE = os.path.join(SCRIPT_DIR, "img_base.png")
FONT_PATH = os.path.join(SCRIPT_DIR, "consolasb.ttf")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "final_status.jpg")

# Dimensions
IMAGE_SIZE = (720, 1278)
TEXT_POSITION = (360, 700)  # Centered horizontally (720 / 2 = 360)
PROGRESS_BAR_START = (81, 860)
PROGRESS_BAR_MAX_WIDTH = 558
PROGRESS_BAR_HEIGHT = 30
FONT_SIZE = 75  # Large font to match reference

# Colors
WHITE = (255, 255, 255)

def calculate_year_progress():
    """Calculate the current year's progress as a percentage with 2 decimal places."""
    now = datetime.now()
    year_start = datetime(now.year, 1, 1)
    year_end = datetime(now.year + 1, 1, 1)
    
    total_seconds = (year_end - year_start).total_seconds()
    elapsed_seconds = (now - year_start).total_seconds()
    
    percentage = (elapsed_seconds / total_seconds) * 100
    return round(percentage, 2)

def generate_status_image():
    """Generate the year progress status image."""
    # Calculate progress
    percentage = calculate_year_progress()
    
    # Load base image
    img = Image.open(BASE_IMAGE).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    # Load font
    try:
        font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    except IOError:
        print(f"Warning: Could not load font from {FONT_PATH}, using default")
        font = ImageFont.load_default()
    
    # Render percentage text
    text = f"{percentage:.2f}%"
    draw.text(TEXT_POSITION, text, fill=WHITE, font=font, anchor="mm")
    
    # Draw progress bar fill
    fill_width = int((percentage / 100) * PROGRESS_BAR_MAX_WIDTH)
    x1, y1 = PROGRESS_BAR_START
    x2 = x1 + fill_width
    y2 = y1 + PROGRESS_BAR_HEIGHT
    draw.rectangle([x1, y1, x2, y2], fill=WHITE)
    
    # Save as JPEG
    img.save(OUTPUT_PATH, "JPEG", quality=95)
    print(f"Generated: {OUTPUT_PATH}")
    print(f"Year Progress: {percentage:.2f}%")
    
    return OUTPUT_PATH

if __name__ == "__main__":
    generate_status_image()
