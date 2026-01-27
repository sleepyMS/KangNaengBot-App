import os
from PIL import Image, ImageDraw, ImageOps

SOURCE_IMAGE = 'kangnaengbot_icon_source.png'
RES_DIR = 'android/app/src/main/res'

SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def create_round_icon(img, size):
    # Create a circular mask
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Resize image
    output = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Apply mask
    output_round = ImageOps.fit(output, mask.size, centering=(0.5, 0.5))
    output_round.putalpha(mask)
    return output_round

def main():
    if not os.path.exists(SOURCE_IMAGE):
        print(f"Error: {SOURCE_IMAGE} not found.")
        return

    try:
        img = Image.open(SOURCE_IMAGE)
        print(f"Loaded {SOURCE_IMAGE}")
        
        # Ensure RGBA for transparency handling
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        for folder, size in SIZES.items():
            folder_path = os.path.join(RES_DIR, folder)
            os.makedirs(folder_path, exist_ok=True)
            
            # Save square icon (ic_launcher.png)
            # Android adaptive icons usually expect a full square background, 
            # but for simple replacement, a simple resize works.
            # Using LANCZOS for high quality downsampling
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            icon_path = os.path.join(folder_path, 'ic_launcher.png')
            resized_img.save(icon_path, 'PNG')
            print(f"Saved {icon_path} ({size}x{size})")
            
            # Save round icon (ic_launcher_round.png)
            round_icon = create_round_icon(img, size)
            round_path = os.path.join(folder_path, 'ic_launcher_round.png')
            round_icon.save(round_path, 'PNG')
            print(f"Saved {round_path} ({size}x{size})")
            
        print("All icons updated successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    main()
