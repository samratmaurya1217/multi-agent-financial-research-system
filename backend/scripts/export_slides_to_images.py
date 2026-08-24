"""
export_slides_to_images.py
Exports all slides of the PowerPoint presentation to PNG images for visual inspection.
"""

import os
import sys
import win32com.client

def export_pptx_to_images():
    pptx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../project doc/Velsora_Multi_Agent_Financial_Research_System_Presentation.pptx"))
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../project doc/presentation_slides"))
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(pptx_path):
        print(f"File not found: {pptx_path}")
        return

    print(f"Opening PowerPoint to export: {pptx_path}")
    powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
    # Don't make it visible if not necessary or visible=True
    powerpoint.Visible = True

    try:
        deck = powerpoint.Presentations.Open(pptx_path)
        print(f"Total slides found: {deck.Slides.Count}")
        for i in range(1, deck.Slides.Count + 1):
            slide = deck.Slides(i)
            img_path = os.path.join(output_dir, f"slide_{i:02d}.png")
            # Export with 1920x1080 resolution
            slide.Export(img_path, "PNG", 1920, 1080)
            print(f"Exported slide {i} -> {img_path}")
        deck.Close()
        print("All slides exported successfully.")
    except Exception as e:
        print(f"Error exporting slides: {e}")
    finally:
        powerpoint.Quit()

if __name__ == "__main__":
    export_pptx_to_images()
