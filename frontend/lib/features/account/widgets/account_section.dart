import 'package:flutter/material.dart';

class AccountSection extends StatelessWidget {
  final String title;
  final bool isExpanded;
  final VoidCallback onTap;
  final Widget? child;

  const AccountSection({
    super.key,
    required this.title,
    required this.isExpanded,
    required this.onTap,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          if (isExpanded)
            BoxShadow(
              color: Colors.black.withValues(alpha: .1),
              blurRadius: 5,
              offset: const Offset(0, 3),
            ),
        ],
      ),
      child: Column(
        children: [
          ListTile(
            title: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            trailing: Icon(
              isExpanded ? Icons.expand_less : Icons.chevron_right,
              color: Colors.black,
            ),
            onTap: onTap,
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: isExpanded && child != null
                ? Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16.0,
                      vertical: 8.0,
                    ),
                    child: child,
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
