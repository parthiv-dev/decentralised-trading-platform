import os
import json
# shutil is not strictly needed if only os.makedirs is used for directory creation
# import shutil 

def update_json_image_links_in_place():
    """
    Reads JSON files from a 'pokemon_metadata' subdirectory,
    updates their 'image' field to an IPFS location, and saves
    the changes back to the same files (in-place modification).
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Source and output folder are now the same: 'pokemon_metadata'
    json_folder_name = "pokemon_metadata" 
    json_folder_path = os.path.join(script_dir, json_folder_name)

    ipfs_cid = "bafybeif5inisqdaiu7kbv7gnwe6zbwpvr4kr5wuiebfb6cidaq6ipxwbua"

    if not os.path.isdir(json_folder_path):
        print(f"Error: Directory not found: {json_folder_path}")
        print(f"Please ensure the JSON files are in a subfolder named '{json_folder_name}' relative to the script.")
        return

    # Ensure the directory exists (though if reading from it, it should)
    os.makedirs(json_folder_path, exist_ok=True) 
    print(f"Target directory for JSON files: {json_folder_path}")

    print(f"Scanning for JSON files in: {json_folder_path}")
    processed_files_count = 0
    error_files_count = 0

    for filename in os.listdir(json_folder_path):
        if filename.lower().endswith(".json"):
            file_path = os.path.join(json_folder_path, filename) # Path to the file to be modified
            
            number_of_json_file = os.path.splitext(filename)[0]
            new_image_url = f"ipfs://{ipfs_cid}/{number_of_json_file}.png"

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                current_image_url = data.get('image', 'Not set')
                print(f"Processing {filename}: Current image URL was: {current_image_url}")
                
                # Removed the conditional skip to ensure the image field is always set
                # if data.get('image') == new_image_url:
                #     print(f"Skipping {filename}: Image URL is already correct ({new_image_url}).")
                #     continue

                data['image'] = new_image_url # This will now always execute
                
                with open(file_path, 'w', encoding='utf-8') as f_out: # Write back to the same file
                    json.dump(data, f_out, indent=4)
                
                print(f"Updated {filename}: New image URL set to {new_image_url}.")
                processed_files_count += 1
            except json.JSONDecodeError:
                print(f"Error: Could not decode JSON from {filename}. Skipping.")

    print("\n--- Summary ---")
    print(f"Successfully updated {processed_files_count} JSON files in '{json_folder_path}'.")
    if error_files_count > 0:
        print(f"Encountered errors with {error_files_count} files during processing.")
    if processed_files_count == 0 and error_files_count == 0 and not any(f.lower().endswith(".json") for f in os.listdir(json_folder_path)):
        print("No JSON files found in the directory.")
    elif processed_files_count == 0 and error_files_count == 0:
        print("No JSON files required updating or no JSON files found.")


if __name__ == "__main__":
    # IMPORTANT: This script modifies files in-place.
    # It's highly recommended to have a backup of your 'pokemon_metadata' folder
    # before running this script.
    update_json_image_links_in_place()