import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NavigationBreadcrumb } from './NavigationBreadcrumb';
import styles from './TopNavbar.module.css';

export function TopNavbar() {
  return (
    <header className={styles.topNavbar}>
      <div className={styles.left}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/devlog-logo-text.svg" alt="Devlog Logo" width={120} height={32} />
        </Link>
        <div className={styles.breadcrumbContainer}>
          <NavigationBreadcrumb />
        </div>
      </div>
      <div className={styles.right}>
        {/* TODO: Replace with real user info/menu */}
        <div className={styles.userPlaceholder}>User</div>
      </div>
    </header>
  );
}
