import os
import json
import requests # For making API calls
import time     # For potential rate limiting delays

# --- Configuration ---
BASE_PROJECT_PATH = "." 
# Assuming image filenames in SOURCE_IMAGE_FOLDER are used to get Pokemon names for API query
SOURCE_IMAGE_FOLDER = os.path.join(BASE_PROJECT_PATH, "data", "pokemon_images", "byName") 
OUTPUT_METADATA_FOLDER = os.path.join(BASE_PROJECT_PATH, "data", "pokemon_metadata")
MAX_FILES_TO_PROCESS = 100 # Or your desired limit
POKEAPI_BASE_URL = "https://pokeapi.co/api/v2/"

# --- Helper Function to Fetch Data ---
def fetch_pokemon_data(pokemon_name_or_id):
    """
    Fetches data for a given Pokemon name or ID from PokeAPI.
    Returns a dictionary with extracted data or None if an error occurs.
    """
    pokemon_name_or_id = str(pokemon_name_or_id).lower() 
    print(f"Fetching data for: {pokemon_name_or_id}...")
    
    api_response = None # Initialize to handle potential errors before assignment
    try:
        api_response = requests.get(f"{POKEAPI_BASE_URL}pokemon/{pokemon_name_or_id}", timeout=10)
        api_response.raise_for_status() 
        data = api_response.json()

        name = data.get('name', pokemon_name_or_id).capitalize()
        
        types_data = data.get('types', [])
        type1 = types_data[0]['type']['name'].capitalize() if len(types_data) > 0 else ""
        type2 = types_data[1]['type']['name'].capitalize() if len(types_data) > 1 else ""

        stats = {}
        for stat_entry in data.get('stats', []):
            stat_name = stat_entry['stat']['name']
            base_stat = stat_entry['base_stat']
            if stat_name == 'hp':
                stats['HP'] = base_stat
            elif stat_name == 'attack':
                stats['Attack'] = base_stat
            elif stat_name == 'defense':
                stats['Defense'] = base_stat
            elif stat_name == 'speed':
                stats['Speed'] = base_stat
            elif stat_name == 'special-attack': 
                stats['Special'] = base_stat 
        
        description = f"Official data for {name}." 
        species_url = data.get('species', {}).get('url')
        if species_url:
            time.sleep(0.2) 
            species_response = requests.get(species_url, timeout=10)
            species_response.raise_for_status()
            species_data = species_response.json()
            
            flavor_text_entries = species_data.get('flavor_text_entries', [])
            for entry in flavor_text_entries:
                if entry['language']['name'] == 'en':
                    description = entry['flavor_text'].replace('\n', ' ').replace('\f', ' ').strip()
                    break 

        return {
            "name": name,
            "description": description,
            "type1": type1,
            "type2": type2,
            "hp": stats.get('HP', 0),
            "attack": stats.get('Attack', 0),
            "defense": stats.get('Defense', 0),
            "speed": stats.get('Speed', 0),
            "special": stats.get('Special', 0) 
        }

    except requests.exceptions.HTTPError as http_err:
        if api_response is not None and api_response.status_code == 404:
            print(f"Pokemon '{pokemon_name_or_id}' not found on PokeAPI.")
        else:
            print(f"HTTP error fetching data for {pokemon_name_or_id}: {http_err}")
    except requests.exceptions.RequestException as req_err:
        print(f"Request error fetching data for {pokemon_name_or_id}: {req_err}")
    except Exception as e:
        print(f"An unexpected error occurred while fetching data for {pokemon_name_or_id}: {e}")
    return None


# --- Main Logic ---
def generate_metadata_files():
    print(f"Source image folder (for names): {os.path.abspath(SOURCE_IMAGE_FOLDER)}")
    print(f"Output metadata folder: {os.path.abspath(OUTPUT_METADATA_FOLDER)}")

    if not os.path.isdir(SOURCE_IMAGE_FOLDER):
        print(f"Error: Source directory '{SOURCE_IMAGE_FOLDER}' (for Pokemon names) not found.")
        return

    os.makedirs(OUTPUT_METADATA_FOLDER, exist_ok=True)
    print(f"Ensured output directory exists: {OUTPUT_METADATA_FOLDER}")

    files_processed_count = 0
    successful_api_fetches = 0
    json_file_number = 1 
    
    all_entries = os.listdir(SOURCE_IMAGE_FOLDER)
    # Assuming image files in SOURCE_IMAGE_FOLDER are named like "PokemonName.png"
    image_filenames = sorted([f for f in all_entries if os.path.isfile(os.path.join(SOURCE_IMAGE_FOLDER, f))])

    if not image_filenames:
        print(f"No files found in '{SOURCE_IMAGE_FOLDER}' to derive Pokemon names from.")
        return

    print(f"Found {len(image_filenames)} files in source directory. Processing up to {MAX_FILES_TO_PROCESS}.")

    for filename_with_ext in image_filenames:
        if files_processed_count >= MAX_FILES_TO_PROCESS:
            print(f"Reached maximum limit of {MAX_FILES_TO_PROCESS} files to process for API calls.")
            break
        
        files_processed_count += 1
        pokemon_name_from_file = os.path.splitext(filename_with_ext)[0]

        api_data = fetch_pokemon_data(pokemon_name_from_file)
        
        current_metadata_attributes = []
        if api_data:
            successful_api_fetches +=1
            name_to_use = api_data["name"]
            description_to_use = api_data["description"]

            # Construct attributes in OpenSea format
            if api_data["type1"]:
                current_metadata_attributes.append({"trait_type": "Type 1", "value": api_data["type1"]})
            if api_data["type2"]: # Only add Type 2 if it exists
                current_metadata_attributes.append({"trait_type": "Type 2", "value": api_data["type2"]})
            
            current_metadata_attributes.append({"trait_type": "HP", "value": api_data["hp"]})
            current_metadata_attributes.append({"trait_type": "Attack", "value": api_data["attack"]})
            current_metadata_attributes.append({"trait_type": "Defense", "value": api_data["defense"]})
            current_metadata_attributes.append({"trait_type": "Speed", "value": api_data["speed"]})
            current_metadata_attributes.append({"trait_type": "Special", "value": api_data["special"]})
        else:
            print(f"Using placeholder data for {pokemon_name_from_file} due to API fetch issue.")
            name_to_use = pokemon_name_from_file.capitalize()
            description_to_use = f"Placeholder description for {name_to_use}."
            # Add placeholder attributes in OpenSea format
            current_metadata_attributes.extend([
                {"trait_type": "Type 1", "value": "Unknown"},
                {"trait_type": "HP", "value": 0},
                {"trait_type": "Attack", "value": 0},
                {"trait_type": "Defense", "value": 0},
                {"trait_type": "Speed", "value": 0},
                {"trait_type": "Special", "value": 0}
            ])

        metadata_payload = {
            "name": name_to_use,
            "description": description_to_use,
            "image": "",  # Empty string as requested
            "attributes": current_metadata_attributes
        }
        
        output_json_filename = os.path.join(OUTPUT_METADATA_FOLDER, f"{json_file_number}.json")
        json_file_number += 1

        try:
            with open(output_json_filename, 'w', encoding='utf-8') as f:
                json.dump(metadata_payload, f, indent=4)
            print(f"Successfully created/updated OpenSea metadata: {output_json_filename}")
        except Exception as e:
            print(f"Error writing JSON to {output_json_filename} (original name: {pokemon_name_from_file}): {e}")
        
        time.sleep(0.3) 

    print(f"\n--- Metadata Generation Summary ---")
    print(f"Total image files considered for processing: {files_processed_count} (up to a max of {MAX_FILES_TO_PROCESS}).")
    print(f"Successfully fetched data from API for: {successful_api_fetches} Pokemon.")
    print(f"Metadata files generated/updated in: {os.path.abspath(OUTPUT_METADATA_FOLDER)} (named 1.json, 2.json, ...)")

if __name__ == "__main__":
    # You might want to create a dedicated script name like `generate_opensea_pokemon_metadata.py`
    # For now, I'm using a generic name for the filepath comment.
    # Ensure SOURCE_IMAGE_FOLDER points to where your "Abomasnow.png" (etc.) files are.
    # Ensure OUTPUT_METADATA_FOLDER is where you want "1.json", "2.json" to be saved.
    generate_metadata_files()