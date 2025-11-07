import 'package:flutter/material.dart';
import 'package:aurabus/features/account/widgets/account_section.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  final Set<int> expandedSections = {};
  bool busNotificationEnabled = true;

  void toggleSection(int index) {
    setState(() {
      if (expandedSections.contains(index)) {
        expandedSections.remove(index);
      } else {
        expandedSections.add(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16.0),
          child: Column(
            children: [
              const SizedBox(height: 16),
              const Text(
                'Account Settings',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),

              AccountSection(
                title: 'Account Info',
                isExpanded: expandedSections.contains(0),
                onTap: () => toggleSection(0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const CircleAvatar(
                          radius: 28,
                          backgroundImage: AssetImage('assets/profile_pic.png'),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'John Doe',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              'Edit your profile picture',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Bus Coming Notification'),
                        Switch(
                          value: busNotificationEnabled,
                          onChanged: (value) {
                            setState(() => busNotificationEnabled = value);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Subscription',
                isExpanded: expandedSections.contains(1),
                onTap: () => toggleSection(1),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'LIBERA CIRCOLAZIONE UNITN',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),

                        const Icon(
                          Icons.qr_code_2_rounded,
                          size: 40,
                          color: Colors.black,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text('Code:'), Text('00000')],
                    ),
                    const SizedBox(height: 4),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('Status:'),
                        Text(
                          'Valid',
                          style: TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Type:'),
                        Text(
                          'Libera circolazione UNITN',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text('Start date:'), Text('01/09/2025')],
                    ),
                    const SizedBox(height: 4),

                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text('Expiration Date:'), Text('31/08/2026')],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Contact Us',
                isExpanded: expandedSections.contains(2),
                onTap: () => toggleSection(2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(
                          Icons.email_outlined,
                          size: 20,
                          color: Colors.black54,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'support@aurabus.com',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: const [
                        Icon(Icons.phone, size: 20, color: Colors.black54),
                        SizedBox(width: 8),
                        Text(
                          '+39 333 123 4567',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: const [
                        Icon(
                          Icons.camera_alt_outlined,
                          size: 20,
                          color: Colors.black54,
                        ),
                        SizedBox(width: 8),
                        Text(
                          '@aurabus_official',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Ranking',
                isExpanded: expandedSections.contains(3),
                onTap: () => toggleSection(3),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Logout',
                isExpanded: false,
                onTap: () {
                  // Handle logout action
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
