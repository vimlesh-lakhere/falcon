import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _isScanned = false;
  bool _isTorchOn = false;
  late AnimationController _animController;
  late Animation<double> _scanLineAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _scanLineAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isScanned) return;

    for (final barcode in capture.barcodes) {
      final code = barcode.rawValue ?? barcode.displayValue;
      if (code != null && code.trim().isNotEmpty) {
        _isScanned = true;
        HapticFeedback.heavyImpact();
        Navigator.of(context).pop(code.trim());
        break;
      }
    }
  }

  void _toggleTorch() {
    setState(() {
      _isTorchOn = !_isTorchOn;
    });
    _controller.toggleTorch();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final scanAreaSize = size.width * 0.78;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Camera Viewfinder
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),

          // 2. Dark Overlay mask around scan window
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withValues(alpha: 0.65),
              BlendMode.srcOut,
            ),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Center(
                  child: Container(
                    width: scanAreaSize,
                    height: scanAreaSize * 0.75,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Scan Target Frame & Animated Line
          Center(
            child: SizedBox(
              width: scanAreaSize,
              height: scanAreaSize * 0.75,
              child: Stack(
                children: [
                  // Corner target markers
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _TargetCornerPainter(),
                    ),
                  ),

                  // Animated laser scan line
                  AnimatedBuilder(
                    animation: _scanLineAnimation,
                    builder: (context, child) {
                      return Positioned(
                        top: _scanLineAnimation.value *
                            (scanAreaSize * 0.75 - 4),
                        left: 12,
                        right: 12,
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Colors.transparent,
                                Color(0xFFFF6D00),
                                Color(0xFFFF9100),
                                Colors.transparent,
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFFF6D00)
                                    .withValues(alpha: 0.8),
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 4. Top Header & Controls
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.black54,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                  const Text(
                    'Align Barcode in Box',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      shadows: [
                        Shadow(color: Colors.black, blurRadius: 4),
                      ],
                    ),
                  ),
                  CircleAvatar(
                    backgroundColor:
                        _isTorchOn ? const Color(0xFFFF6D00) : Colors.black54,
                    child: IconButton(
                      icon: Icon(
                        _isTorchOn ? Icons.flash_on : Icons.flash_off,
                        color: Colors.white,
                      ),
                      onPressed: _toggleTorch,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Bottom Helper Text
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white12),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.qr_code_scanner,
                        color: Color(0xFFFF6D00), size: 20),
                    SizedBox(width: 8),
                    Text(
                      'बारकोड को बॉक्स में रखें',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TargetCornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFFF6D00)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    const cornerLength = 32.0;

    // Top Left
    canvas.drawLine(const Offset(0, 0), const Offset(cornerLength, 0), paint);
    canvas.drawLine(const Offset(0, 0), const Offset(0, cornerLength), paint);

    // Top Right
    canvas.drawLine(
        Offset(size.width, 0), Offset(size.width - cornerLength, 0), paint);
    canvas.drawLine(
        Offset(size.width, 0), Offset(size.width, cornerLength), paint);

    // Bottom Left
    canvas.drawLine(
        Offset(0, size.height), Offset(cornerLength, size.height), paint);
    canvas.drawLine(
        Offset(0, size.height), Offset(0, size.height - cornerLength), paint);

    // Bottom Right
    canvas.drawLine(Offset(size.width, size.height),
        Offset(size.width - cornerLength, size.height), paint);
    canvas.drawLine(Offset(size.width, size.height),
        Offset(size.width, size.height - cornerLength), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
