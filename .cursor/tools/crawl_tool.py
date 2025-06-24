#!/usr/bin/env python3
"""
crawl_tool.py - Simplified interface to Crawl4AI for use in other Python scripts

This module provides simple functions to crawl websites using Crawl4AI.

Example usage:
    from crawl_tool import extract_webpage_content, extract_as_json

    # Get markdown content
    markdown_content = extract_webpage_content("https://example.com")

    # Get JSON data
    json_data = extract_as_json("https://docs.python.org")
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, Union, List

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


async def _crawl_async(
    url: str,
    deep: bool = False,
    max_pages: int = 5,
    use_cache: bool = True,
    verbose: bool = True,
):
    """
    Internal async function to crawl a website.

    Args:
        url: Website URL to crawl
        deep: Whether to do deep crawling with BFS
        max_pages: Maximum pages to crawl in deep mode
        use_cache: Whether to use caching
        verbose: Whether to show detailed logs

    Returns:
        Crawl4AI result object
    """
    browser_config = BrowserConfig(
        headless=True,
        verbose=verbose,
    )

    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED if use_cache else CacheMode.BYPASS,
    )

    # Set up content filter
    run_config.markdown_content_filter = PruningContentFilter(
        threshold=0.48, threshold_type="fixed"
    )

    if deep:
        run_config.deep_crawl = "bfs"  # Breadth-first search strategy
        run_config.max_pages = max_pages

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        return result


def extract_webpage_content(
    url: str,
    output_format: str = "markdown",
    deep: bool = False,
    max_pages: int = 5,
    use_cache: bool = True,
) -> str:
    """
    Extract content from a webpage in the specified format.

    Args:
        url: Website URL to crawl
        output_format: Format to extract content in ("markdown" or "html")
        deep: Whether to do deep crawling
        max_pages: Maximum pages to crawl in deep mode
        use_cache: Whether to use caching

    Returns:
        Extracted content as string in the specified format
    """
    result = asyncio.run(_crawl_async(url, deep, max_pages, use_cache))

    if not result.success:
        return f"Error: Failed to crawl {url}. Status code: {result.status_code}"

    if output_format == "markdown":
        return (
            result.markdown.fit_markdown
            if result.markdown
            else "No markdown content extracted"
        )
    elif output_format == "html":
        return result.fit_html if result.fit_html else result.html
    else:
        raise ValueError(f"Unsupported output format: {output_format}")


def extract_as_json(
    url: str, deep: bool = False, max_pages: int = 5, use_cache: bool = True
) -> Dict[str, Any]:
    """
    Extract webpage content and metadata as a JSON-serializable dictionary.

    Args:
        url: Website URL to crawl
        deep: Whether to do deep crawling
        max_pages: Maximum pages to crawl in deep mode
        use_cache: Whether to use caching

    Returns:
        Dictionary containing extracted data
    """
    result = asyncio.run(_crawl_async(url, deep, max_pages, use_cache))

    if not result.success:
        return {"error": f"Failed to crawl {url}", "status_code": result.status_code}

    # Create a JSON object with extracted data
    output_data = {
        "url": url,
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
                list(result.internal_links) if hasattr(result, "internal_links") else []
            ),
            "external": (
                list(result.external_links) if hasattr(result, "external_links") else []
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

    return output_data


def extract_structured_data(
    url: str, schema: Dict[str, Any], use_cache: bool = True
) -> Dict[str, Any]:
    """
    Extract structured data from a webpage using CSS selectors.

    This requires setting up a schema dictionary with selectors.
    See Crawl4AI documentation for schema format.

    Args:
        url: Website URL to crawl
        schema: Schema dictionary defining how to extract data
        use_cache: Whether to use caching

    Returns:
        Dictionary with extracted structured data
    """
    from crawl4ai.extraction_strategy import JsonCssExtractionStrategy

    extraction_strategy = JsonCssExtractionStrategy(schema, verbose=True)

    browser_config = BrowserConfig(
        headless=True,
        verbose=True,
    )

    run_config = CrawlerRunConfig(
        extraction_strategy=extraction_strategy,
        cache_mode=CacheMode.ENABLED if use_cache else CacheMode.BYPASS,
    )

    async def _extract():
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=run_config)
            if result.success and result.extracted_content:
                return json.loads(result.extracted_content)
            return {"error": "Failed to extract structured data"}

    return asyncio.run(_extract())


if __name__ == "__main__":
    # Simple example usage when run directly
    import sys

    if len(sys.argv) > 1:
        url = sys.argv[1]
        print(extract_webpage_content(url))
    else:
        print("Please provide a URL to crawl")
        print("Example: python crawl_tool.py https://example.com")
