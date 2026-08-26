# SPDX-License-Identifier: MIT
"""
health.py — Dedicated Health Check Service for Velsora Multi-Agent System
Designed for UptimeRobot, Render, Kubernetes, and Cloud Health Monitors.
Provides GET and HEAD endpoints for /health, /healthz, /ping, and root /.
"""

import time
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.database import ping as db_ping

logger = logging.getLogger("velsora.health")

router = APIRouter(tags=["Health"])

_START_TIME = time.time()


def get_uptime_seconds() -> float:
    return round(time.time() - _START_TIME, 2)


@router.get("/health", summary="Service Health Check")
@router.head("/health", summary="Service Health Check (HEAD)")
@router.get("/healthz", summary="Liveness Probe")
@router.head("/healthz", summary="Liveness Probe (HEAD)")
def health_check():
    """
    Primary health check endpoint for UptimeRobot and load balancers.
    Verifies API availability and MongoDB Atlas database connectivity.
    """
    db_ok = False
    try:
        db_ok = db_ping()
    except Exception as e:
        logger.warning(f"Health check database ping failed: {e}")

    uptime = get_uptime_seconds()
    now_iso = datetime.now(timezone.utc).isoformat()

    payload = {
        "status": "healthy" if db_ok else "degraded",
        "service": "velsora-api",
        "version": "2.0.0",
        "database": "connected" if db_ok else "disconnected",
        "uptime_seconds": uptime,
        "timestamp": now_iso,
    }

    status_code = status.HTTP_200_OK if db_ok else status.HTTP_200_OK  # Return 200 so monitors don't false-alarm during transient DB hiccups
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/ping", summary="Fast Ping")
@router.head("/ping", summary="Fast Ping (HEAD)")
def ping_check():
    """
    Lightweight fast-ping endpoint that does not query the database.
    Ideal for high-frequency 1-minute uptime checks.
    """
    return {
        "status": "ok",
        "pong": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/", summary="Root API Status")
def root_status():
    """
    Root status endpoint so monitors pinging the base URL receive HTTP 200 OK.
    """
    return {
        "service": "Velsora Multi-Agent Financial Research System API",
        "status": "online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "uptime_seconds": get_uptime_seconds(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
