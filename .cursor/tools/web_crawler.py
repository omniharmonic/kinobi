#!/usr/bin/env python3
"""
web_crawler.py - A tool for crawling websites and extracting content using Crawl4AI

Usage:
    python web_crawler.py <url> [--output-format <format>] [--deep] [--max-pages <number>]

Arguments:
    url              The URL to crawl
    --output-format  Output format: markdown, html, json (default: markdown)
    --deep           Enable deep crawling with BFS strategy
    --max-pages      Maximum number of pages to crawl in deep mode (default: 5)

Examples:
    python web_crawler.py https://example.com
    python web_crawler.py https://docs.python.org --output-format json --deep --max-pages 10
"""

import os
import sys
import json
import argparse
import asyncio
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.content_filter_strategy import PruningContentFilter


def get_crawl4ai_directory(subdir: str = "") -> str:
    """
    Get the path to the .crawl4ai directory in the same directory as this script.

    Args:
        subdir: Optional subdirectory within .crawl4ai

    Returns:
        Full path to the .crawl4ai directory or subdirectory
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(script_dir, ".crawl4ai")
    if subdir:
        full_path = os.path.join(base_dir, subdir)
    else:
        full_path = base_dir

    os.makedirs(full_path, exist_ok=True)
    return full_path


def parse_arguments():
    parser = argparse.ArgumentParser(description="Web crawler tool using Crawl4AI")
    parser.add_argument("url", help="URL to crawl")
    parser.add_argument(
        "--output-format",
        default="markdown",
        choices=["markdown", "html", "json"],
        help="Output format (default: markdown)",
    )
    parser.add_argument(
        "--deep", action="store_true", help="Enable deep crawling with BFS strategy"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=5,
        help="Maximum number of pages for deep crawl (default: 5)",
    )
    parser.add_argument("--output-file", help="Save output to specified file")
    parser.add_argument("--no-cache", action="store_true", help="Bypass cache")
    return parser.parse_args()


async def crawl_website(args):
    # Configure browser
    browser_config = BrowserConfig(
        headless=True,
        verbose=True,
    )

    # Configure crawler run
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS if args.no_cache else CacheMode.ENABLED,
    )

    # Set up content filter
    run_config.markdown_content_filter = PruningContentFilter(
        threshold=0.48, threshold_type="fixed"
    )

    # Deep crawl configuration
    if args.deep:
        run_config.deep_crawl = "bfs"  # Breadth-first search strategy
        run_config.max_pages = args.max_pages

    # Initialize crawler
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=args.url, config=run_config)

        if not result.success:
            print(f"Error: Failed to crawl {args.url}")
            print(f"Status code: {result.status_code}")
            sys.exit(1)

        # Format the output based on user's choice
        if args.output_format == "markdown":
            # Try to get fit_markdown first, then fall back to raw_markdown, or just convert from html
            if (
                result.markdown
                and hasattr(result.markdown, "fit_markdown")
                and result.markdown.fit_markdown
            ):
                output = result.markdown.fit_markdown
            elif (
                result.markdown
                and hasattr(result.markdown, "raw_markdown")
                and result.markdown.raw_markdown
            ):
                output = result.markdown.raw_markdown
            elif result.html:
                # Try to get some basic content from HTML
                soup = BeautifulSoup(result.html, "html.parser")

                # Extract title
                title = ""
                if soup.title and soup.title.string:
                    title = f"# {soup.title.string.strip()}\n\n"

                # Extract main content paragraphs
                content = ""
                for p in soup.find_all("p"):
                    if p.text and len(p.text.strip()) > 0:
                        content += f"{p.text.strip()}\n\n"

                output = title + content
            else:
                output = "No content could be extracted from the webpage."
        elif args.output_format == "html":
            output = result.fit_html if result.fit_html else result.html
        elif args.output_format == "json":
            # Create a JSON object with extracted data
            output_data = {
                "url": args.url,
                "redirected_url": (
                    result.redirected_url if hasattr(result, "redirected_url") else None
                ),
                "status_code": result.status_code,
                "success": result.success,
                "content_length": len(result.html) if result.html else 0,
                "markdown_length": (
                    len(result.markdown.fit_markdown)
                    if result.markdown and hasattr(result.markdown, "fit_markdown")
                    else 0
                ),
                "links": {
                    "internal": (
                        list(result.internal_links)
                        if hasattr(result, "internal_links")
                        else []
                    ),
                    "external": (
                        list(result.external_links)
                        if hasattr(result, "external_links")
                        else []
                    ),
                },
                "timestamp": datetime.now().isoformat(),
            }

            # Add metadata if available
            if hasattr(result, "meta"):
                output_data["meta"] = {
                    "title": result.meta.get("title", ""),
                    "description": result.meta.get("description", ""),
                    "keywords": result.meta.get("keywords", ""),
                }

            output = json.dumps(output_data, indent=2)

        # Save or print the output
        if args.output_file:
            with open(args.output_file, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Output saved to {args.output_file}")
        else:
            print(output)

        return result


def main():
    args = parse_arguments()

    # Configure output file if not specified
    if not args.output_file and not args.output_format == "json":
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        domain = args.url.replace("http://", "").replace("https://", "").split("/")[0]
        # Use the helper function to get the extracts directory
        output_dir = get_crawl4ai_directory("extracts")
        args.output_file = os.path.join(
            output_dir, f"{domain}_{timestamp}.{args.output_format}"
        )

    # Run the crawler
    asyncio.run(crawl_website(args))


if __name__ == "__main__":
    main()
