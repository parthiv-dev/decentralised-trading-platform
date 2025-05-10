import os
import shutil # For copying files

# NEW: Maximum number of images to process
MAX_NUMBER = 100

def rename_and_copy_images(source_folder_path, destination_folder_path, max_files_to_process):
    """
    Copies up to max_files_to_process image files from source_folder_path, 
    renames them sequentially (1.ext, 2.ext, ...), and saves them to destination_folder_path.

    Args:
        source_folder_path (str): The path to the folder containing the original images.
        destination_folder_path (str): The path to the folder where renamed images will be saved.
        max_files_to_process (int): The maximum number of image files to process.
    """
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp')
    
    if not os.path.isdir(source_folder_path):
        print(f"Error: Source folder '{source_folder_path}' not found.")
        return

    # Create destination folder if it doesn't exist
    os.makedirs(destination_folder_path, exist_ok=True)
    print(f"Ensured destination folder exists: {os.path.abspath(destination_folder_path)}")

    files_in_source_folder = os.listdir(source_folder_path)
    image_files = [
        f for f in files_in_source_folder 
        if os.path.isfile(os.path.join(source_folder_path, f)) and f.lower().endswith(image_extensions)
    ]
    
    # Optional: Sort files to ensure a consistent processing order
    image_files.sort() 

    count = 1
    processed_files_count = 0 # Renamed from renamed_files for clarity
    skipped_files = 0

    print(f"Scanning source folder: {os.path.abspath(source_folder_path)}")
    print(f"Found {len(image_files)} image files. Will process up to {max_files_to_process}.")

    for filename in image_files:
        if processed_files_count >= max_files_to_process:
            print(f"Reached maximum limit of {max_files_to_process} files to process.")
            break # Stop processing more files

        try:
            old_file_path = os.path.join(source_folder_path, filename)
            file_extension = os.path.splitext(filename)[1]
            new_filename = f"{count}{file_extension}"
            new_file_path = os.path.join(destination_folder_path, new_filename)

            if os.path.exists(new_file_path):
                print(f"Warning: File '{new_filename}' already exists in destination '{destination_folder_path}'. Skipping copy for '{filename}'.")
                skipped_files +=1
                # If a file like "1.png" already exists, we should still try to name the next one "2.png"
                # This logic ensures 'count' increments if the target name was already what we expected.
                if new_filename.startswith(str(count)) and new_filename.endswith(file_extension):
                    count += 1
                continue

            shutil.copy2(old_file_path, new_file_path) 
            print(f"Copied '{filename}' from '{source_folder_path}' to '{new_file_path}'")
            count += 1
            processed_files_count +=1
        except Exception as e:
            print(f"Error processing file '{filename}': {e}")
            skipped_files +=1
    
    print(f"\nRenaming and copying process complete.")
    print(f"Successfully copied and renamed: {processed_files_count} files.")
    print(f"Skipped/Errors: {skipped_files} files.")

if __name__ == "__main__":
    script_location = os.path.dirname(os.path.abspath(__file__))
    
    source_folder_name = "byName"       # Subfolder for source images
    destination_folder_name = "byNumber" # Subfolder for renamed images
    
    source_path = os.path.join(script_location, source_folder_name)
    destination_path = os.path.join(script_location, destination_folder_name)
    
    print(f"Script will read from: {source_path}")
    print(f"Script will write to: {destination_path}")
    
    rename_and_copy_images(source_path, destination_path, MAX_NUMBER)