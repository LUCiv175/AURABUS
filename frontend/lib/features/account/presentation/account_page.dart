import 'package:flutter/material.dart';
import 'package:aurabus/features/account/widgets/account_section.dart';
import 'package:aurabus/features/account/widgets/account_info_body.dart';
import 'package:aurabus/features/account/widgets/contact_us_body.dart';
import 'package:aurabus/features/account/widgets/subscription_body.dart';

enum AccountSectionType { info, subscription, contact, ranking }

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  final Set<AccountSectionType> expandedSections = {};
  bool busNotificationEnabled = true;

  void toggleSection(AccountSectionType section) {
    setState(() {
      if (expandedSections.contains(section)) {
        expandedSections.remove(section);
      } else {
        expandedSections.add(section);
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
                isExpanded: expandedSections.contains(AccountSectionType.info),
                onTap: () => toggleSection(AccountSectionType.info),
                child: AccountInfoBody(
                  busNotificationEnabled: busNotificationEnabled,
                  onNotificationToggle: (value) {
                    setState(() => busNotificationEnabled = value);
                  },
                ),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Subscription',
                isExpanded: expandedSections.contains(
                  AccountSectionType.subscription,
                ),
                onTap: () => toggleSection(AccountSectionType.subscription),
                child: const SubscriptionBody(),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Contact Us',
                isExpanded: expandedSections.contains(
                  AccountSectionType.contact,
                ),
                onTap: () => toggleSection(AccountSectionType.contact),
                child: const ContactUsBody(),
              ),

              const SizedBox(height: 12),

              AccountSection(
                title: 'Ranking',
                isExpanded: expandedSections.contains(
                  AccountSectionType.ranking,
                ),
                onTap: () => toggleSection(AccountSectionType.ranking),
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
