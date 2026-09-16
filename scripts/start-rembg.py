"""
Falcon ERP - Rembg Local Background Removal Service
Runs danielgatis/rembg on http://127.0.0.1:7000 for 100% free, unlimited, offline AI background removal.
"""
import sys
import os

def main():
    try:
        from rembg.cli import main as rembg_main
    except ImportError:
        print("[Falcon Rembg] rembg is not installed. Installing now...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "rembg[cli]", "onnxruntime"])
        from rembg.cli import main as rembg_main

    import socket
    port = int(os.environ.get("REMBG_PORT", "7000"))
    host = os.environ.get("REMBG_HOST", "0.0.0.0")
    default_model = os.environ.get("REMBG_MODEL", "u2net")

    lan_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=" * 68)
    print("  Falcon ERP - Rembg Local Background Removal Microservice")
    print(f"  Laptop URL   : http://127.0.0.1:{port}")
    print(f"  Mobile/Wi-Fi : http://{lan_ip}:{port}")
    print(f"  API Endpoint : http://{lan_ip}:{port}/api/remove")
    print(f"  Default Model: {default_model} (Fast, Lightweight, High Precision)")
    print("  Cost         : 100% Free & Unlimited (Runs locally on your PC)")
    print("=" * 68)

    try:
        print(f"[Falcon Rembg] Pre-loading model '{default_model}' into memory...")
        from rembg import new_session
        new_session(default_model)
        print(f"[Falcon Rembg] Model '{default_model}' is primed and ready!")
    except Exception as e:
        print(f"[Falcon Rembg] Pre-warm notice: {e}")

    print(f"[Falcon Rembg] Starting server on 0.0.0.0:{port}... (Press Ctrl+C to stop)")

    sys.argv = ["rembg", "s", "--host", host, "--port", str(port), "--no-ui"]
    rembg_main()

if __name__ == "__main__":
    main()
