/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="sl" dir="ltr">
    <Head />
    <Preview>Potrdite spremembo e-pošte za ePTP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://kssbxmudxbifxndnyhsq.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="ePTP" width="120" height="48" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Potrdite spremembo e-pošte</Heading>
        <Text style={text}>
          Zahtevali ste spremembo e-poštnega naslova za ePTP iz{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          na{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Kliknite spodnji gumb za potrditev spremembe:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potrdi spremembo
        </Button>
        <Text style={footer}>
          Če niste zahtevali te spremembe, zavarujte svoj račun.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#f8f9fb', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(215, 25%, 15%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215, 15%, 50%)', lineHeight: '1.6', margin: '0 0 25px' }
const link = { color: 'hsl(215, 85%, 45%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(215, 85%, 45%)', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
