import os
import ffmpeg
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def convert_mp4_to_mp3(input_dir: str, output_dir: str = None) -> None:
    """
    Convert all MP4 files in the input directory to MP3 format.

    Args:
        input_dir (str): Directory containing MP4 files
        output_dir (str, optional): Directory to save MP3 files. If None, uses input_dir
    """
    # Convert input_dir to Path object
    input_path = Path(input_dir)

    # If no output directory specified, use input directory
    if output_dir is None:
        output_path = input_path
    else:
        output_path = Path(output_dir)
        # Create output directory if it doesn't exist
        output_path.mkdir(parents=True, exist_ok=True)

    # Get all MP4 files in the input directory
    mp4_files = list(input_path.glob("*.mp4"))

    if not mp4_files:
        logging.warning(f"No MP4 files found in {input_dir}")
        return

    logging.info(f"Found {len(mp4_files)} MP4 files to convert")

    # Convert each MP4 file to MP3
    for mp4_file in mp4_files:
        try:
            # Create output filename
            output_file = output_path / f"{mp4_file.stem}.mp3"

            logging.info(f"Converting {mp4_file.name} to {output_file.name}")

            # Extract audio from video file
            stream = ffmpeg.input(str(mp4_file))
            stream = ffmpeg.output(
                stream,
                str(output_file),
                acodec="libmp3lame",
                audio_bitrate="192k",
                loglevel="error",
            )

            # Run the conversion
            ffmpeg.run(stream, overwrite_output=True)

            logging.info(
                f"Successfully converted {mp4_file.name} to {output_file.name}"
            )

        except ffmpeg.Error as e:
            logging.error(f"Error converting {mp4_file.name}: {e.stderr.decode()}")
        except Exception as e:
            logging.error(f"Unexpected error converting {mp4_file.name}: {str(e)}")


if __name__ == "__main__":
    # Absolute path to the correct downloads directory
    downloads_dir = "/Users/gideon/Hub/private/resources/template_workspace/download-yt-video/downloads"

    # Print the path for debugging
    print(f"Looking for MP4 files in: {downloads_dir}")

    # Convert all MP4 files in the downloads directory
    convert_mp4_to_mp3(downloads_dir)
