import os
import sys
import random
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
FONT_PATH = os.path.join(PROJECT_ROOT, "assets", "consolasb.ttf")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "final_status.jpg")
OVERLAY_IMAGE_PATH = os.path.join(PROJECT_ROOT, "assets", "overlay_image.png")
FALLBACK_IMAGE = os.path.join(PROJECT_ROOT, "assets", "img_base.png")

# Dimensions & Output
FINAL_SIZE = (720, 1278)
TEXT_POSITION = (360, 700)  # Centered horizontally
PROGRESS_BAR_START = (81, 860)
PROGRESS_BAR_MAX_WIDTH = 558
PROGRESS_BAR_HEIGHT = 30
FONT_SIZE = 75

# Colors
WHITE = (255, 255, 255)
BAR_COLOR = (255, 255, 255)

def calculate_year_progress():
    """Calculate the current year's progress as a percentage."""
    now = datetime.now()
    year_start = datetime(now.year, 1, 1)
    year_end = datetime(now.year + 1, 1, 1)
    total_seconds = (year_end - year_start).total_seconds()
    elapsed_seconds = (now - year_start).total_seconds()
    return round((elapsed_seconds / total_seconds) * 100, 2)

def get_background():
    """Fetch random landscape from picsum or fallback to local template."""
    try:
        response = requests.get("https://picsum.photos/1920/1080", timeout=10)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGBA")
    except Exception as e:
        print(f"Warning: Failed to fetch remote background: {e}. Falling back.")
        if os.path.exists(FALLBACK_IMAGE):
            return Image.open(FALLBACK_IMAGE).convert("RGBA")
        return Image.new("RGBA", FINAL_SIZE, (0, 0, 0, 255))

def process_background(bg_img):
    """Aspect-fill resize and center-crop to 720x1278 (no stretching)."""
    target_w, target_h = FINAL_SIZE
    img_w, img_h = bg_img.size
    
    # Calculate scale factor for aspect fill (smallest dimension fits)
    scale = max(target_w / img_w, target_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    
    bg_img = bg_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center crop to target size
    left = (new_w - target_w) / 2
    top = (new_h - target_h) / 2
    right = left + target_w
    bottom = top + target_h
    
    return bg_img.crop((left, top, right, bottom))

def get_random_texture():
    """Pick a random texture from assets/textures/."""
    texture_dir = os.path.join(PROJECT_ROOT, "assets", "textures")
    textures = [f for f in os.listdir(texture_dir) if f.lower().endswith(('.png', '.jpg'))]
    if not textures:
        return None
    texture_path = os.path.join(texture_dir, random.choice(textures))
    return Image.open(texture_path).convert("RGBA")

def generate_status_image():
    percentage = calculate_year_progress()
    bg_img = get_background()
    bg_img = process_background(bg_img)
    
    # 30% Opaque black overlay for readability
    dark_overlay = Image.new("RGBA", bg_img.size, (0, 0, 0, int(255 * 0.3)))
    bg_img = Image.alpha_composite(bg_img, dark_overlay)
    
    # Texture layer
    texture_img = get_random_texture()
    if texture_img:
        texture_img = texture_img.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
        bg_img = Image.alpha_composite(bg_img, texture_img)
    
    # Composite UI Overlay if it exists
    if os.path.exists(OVERLAY_IMAGE_PATH):
        ui_overlay = Image.open(OVERLAY_IMAGE_PATH).convert("RGBA")
        ui_overlay = ui_overlay.resize(FINAL_SIZE, Image.Resampling.LANCZOS)
        bg_img = Image.alpha_composite(bg_img, ui_overlay)
    else:
        print(f"Warning: {OVERLAY_IMAGE_PATH} not found. Skipping UI overlay.")
    
    # Prepare to draw text/bar
    bg_img = bg_img.convert("RGB")
    draw = ImageDraw.Draw(bg_img)
    
    # Load Font
    try:
        font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    except IOError:
        print(f"Warning: {FONT_PATH} missing. Using default.")
        font = ImageFont.load_default()
        
    # Draw Text
    text = f"{percentage:.2f}%"
    draw.text(TEXT_POSITION, text, fill=WHITE, font=font, anchor="mm")
    
    # Draw Progress Bar
    fill_width = int((percentage / 100) * PROGRESS_BAR_MAX_WIDTH)
    x1, y1 = PROGRESS_BAR_START
    x2 = x1 + fill_width
    y2 = y1 + PROGRESS_BAR_HEIGHT
    draw.rectangle([x1, y1, x2, y2], fill=BAR_COLOR)
    
    # Save Output
    bg_img.save(OUTPUT_PATH, "JPEG", quality=95)
    print(f"Generated: {OUTPUT_PATH}")
    print(f"Year Progress: {percentage:.2f}%")

if __name__ == "__main__":
    generate_status_image()
