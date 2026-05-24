import React from 'react';
import PublicLegalPage from '../components/PublicLegalPage';

export default function ShippingPage() {
  return (
    <PublicLegalPage
      slug="shipping-delivery-policy"
      defaultTitle="Shipping & Delivery Policy"
      pageClassName="page-60 page-legal page-typography"
    >
      <main className="section page-60 page-legal page-typography">
      <div className="container">
        <h1>Shipping &amp; Delivery Policy</h1>
        <p>
          At Love and Flour by Pooja, we specialize in online training and digital learning experiences. Since we do not sell or ship physical
          goods, this policy explains how access to our courses is provided.
        </p>

        <h2>1. Mode of Delivery</h2>
        <p>All our courses are digital and delivered online only.</p>
        <p>Once your payment is successfully processed, access details for the course will be sent to your registered email ID.</p>

        <h2>2. Access Timelines</h2>
        <p>Each course comes with a specified access duration, clearly mentioned in the course material or course description.</p>
        <p>Typically, access is granted for 2 years from the date of purchase. However, this duration may vary depending on the course.</p>
        <p>
          Some courses may have shorter access periods (e.g., 6 months or 1 year) while others may provide longer access.
        </p>
        <p>Please check the course details before enrolling to understand the specific access timeline for that course.</p>

        <h2>3. Changes to Access Periods</h2>
        <p>
          Love and Flour by Pooja reserves the right to modify access timelines if required, but any such changes will be communicated to
          learners in advance.
        </p>
        <p>Extensions beyond the specified access period may be offered from time to time as part of promotions, memberships, or subscriptions.</p>

        <h2>4. No Physical Shipping</h2>
        <p>Since all our offerings are digital, no physical shipping, courier, or delivery is applicable.</p>
        <p>You will not incur any shipping charges for purchasing our courses.</p>

        <h2>5. Support</h2>
        <p>
          If you face any difficulty accessing your course, please write to us at tech.loveandflourbypooja@gmail.com. Our team will be happy
          to assist you
        </p>
      </div>
    </main>
    </PublicLegalPage>
  );
}
