import os

def rename_images_in_folder(folder_path="."):
    """
    Renames all image files (jpg, jpeg, png, gif) in the specified folder
    to sequential numbers (1, 2, 3, ...) while preserving their extensions.

    Args:
        folder_path (str): The path to the folder containing the images.
                           Defaults to the current directory.
    """
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp')
    files_in_folder = os.listdir(folder_path)
    image_files = [f for f in files_in_folder if os.path.isfile(os.path.join(folder_path, f)) and f.lower().endswith(image_extensions)]
    
    # Sort files to ensure a consistent renaming order, if desired
    # image_files.sort() # Optional: sort alphabetically or by modification time, etc.

    count = 1
    renamed_files = 0
    skipped_files = 0

    print(f"Scanning folder: {os.path.abspath(folder_path)}")
    print(f"Found {len(image_files)} image files.")

    for filename in image_files:
        try:
            old_file_path = os.path.join(folder_path, filename)
            file_extension = os.path.splitext(filename)[1]
            new_filename = f"{count}{file_extension}"
            new_file_path = os.path.join(folder_path, new_filename)

            # Check if the new filename already exists to avoid overwriting
            # or trying to rename a file to its own new name if script is run multiple times
            if old_file_path == new_file_path:
                print(f"Skipping '{filename}' as it would be renamed to itself (possibly already renamed).")
                skipped_files +=1
                # If it's already in the "1.ext" format, we might want to increment count
                # This part can be made more robust if needed
                if filename.startswith(str(count)) and filename.endswith(file_extension):
                    count += 1
                continue

            if os.path.exists(new_file_path):
                print(f"Warning: File '{new_filename}' already exists. Skipping rename for '{filename}'.")
                skipped_files +=1
                continue

            os.rename(old_file_path, new_file_path)
            print(f"Renamed '{filename}' to '{new_filename}'")
            count += 1
            renamed_files +=1
        except Exception as e:
            print(f"Error renaming file '{filename}': {e}")
            skipped_files +=1
    
    print(f"\nRenaming process complete.")
    print(f"Successfully renamed: {renamed_files} files.")
    print(f"Skipped/Errors: {skipped_files} files.")

if __name__ == "__main__":
    # The script will rename images in the directory where the script itself is located.
    # If you want to specify a different directory, change the path below.
    target_folder = os.path.dirname(os.path.abspath(__file__))
    rename_images_in_folder(target_folder)
    # Or, if you always want it to be a specific subfolder relative to the script:
    # target_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "your_image_subfolder_name")
    # rename_images_in_folder(target_folder)