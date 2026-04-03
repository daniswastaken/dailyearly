import os
import random
import sys
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.path.join(SCRIPT_DIR, "consolasb.ttf")
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "final_status.jpg")
OVERLAY_IMAGE_PATH = os.path.join(SCRIPT_DIR, "overlay_image.png")
FALLBACK_IMAGE = os.path.join(SCRIPT_DIR, "img_base.png")
JWST_DIR = os.path.join(SCRIPT_DIR, "jwst")
STATE_FILE = os.path.join(SCRIPT_DIR, "current_image.txt")

# Ensure jwst directory exists
os.makedirs(JWST_DIR, exist_ok=True)

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

def get_local_background(specific_image=None):
    """Get the next image from the jwst/ directory. If specific_image is provided, use it."""
    valid_extensions = ('.jpg', '.jpeg', '.png')
    images = sorted([f for f in os.listdir(JWST_DIR) if f.lower().endswith(valid_extensions)], reverse=True)
    
    if not images:
        print("jwst/ directory is empty. Using fallback background...")
        if os.path.exists(FALLBACK_IMAGE):
            return Image.open(FALLBACK_IMAGE).convert("RGBA")
        return Image.new("RGBA", FINAL_SIZE, (0, 0, 0, 255))

    chosen_file = None
    
    # Check if a specific image was requested
    if specific_image:
        if specific_image in images:
            chosen_file = specific_image
            print(f"Manual override: Using specific image {chosen_file}")
        else:
            # Try appending extension if missing
            for ext in valid_extensions:
                if f"{specific_image}{ext}" in images:
                    chosen_file = f"{specific_image}{ext}"
                    print(f"Manual override: Using specific image {chosen_file}")
                    break
            
            if not chosen_file:
                print(f"Warning: Specific image '{specific_image}' not found in jwst/ folder. Falling back to cycle.")

    # If no specific image or not found, use the normal cycle
    if not chosen_file:
        print("Fetching image from jwst/ directory cycle...")
        # Get last used image from state file
        last_image = ""
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                last_image = f.read().strip()
                
        # Find index of last used image and pick the next one
        next_index = 0
        if last_image in images:
            next_index = (images.index(last_image) + 1) % len(images)
        
        chosen_file = images[next_index]
        print(f"Cycle using image: {chosen_file}")
    
    # Update state file so the cycle stays in sync
    with open(STATE_FILE, "w") as f:
        f.write(chosen_file)
        
    image_path = os.path.join(JWST_DIR, chosen_file)
    return Image.open(image_path).convert("RGBA")

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

def generate_status_image(specific_image=None):
    percentage = calculate_year_progress()
    bg_img = get_local_background(specific_image)
    bg_img = process_background(bg_img)
    
    # 30% Opaque black overlay for readability
    dark_overlay = Image.new("RGBA", bg_img.size, (0, 0, 0, int(255 * 0.3)))
    bg_img = Image.alpha_composite(bg_img, dark_overlay)
    
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
    # Check for specific image argument
    requested_img = sys.argv[1] if len(sys.argv) > 1 else None
    generate_status_image(requested_img)
