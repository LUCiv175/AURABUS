import 'package:flutter/material.dart';

class ContactUsBody extends StatelessWidget {
  const ContactUsBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        Row(
          children: [
            Icon(Icons.email_outlined, size: 20, color: Colors.black54),
            SizedBox(width: 8),
            Text('support@aurabus.com', style: TextStyle(fontSize: 14)),
          ],
        ),
        SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.phone, size: 20, color: Colors.black54),
            SizedBox(width: 8),
            Text('+39 333 123 4567', style: TextStyle(fontSize: 14)),
          ],
        ),
        SizedBox(height: 8),
        Row(
          children: [
            Icon(Icons.camera_alt_outlined, size: 20, color: Colors.black54),
            SizedBox(width: 8),
            Text('@aurabus_official', style: TextStyle(fontSize: 14)),
          ],
        ),
      ],
    );
  }
}
