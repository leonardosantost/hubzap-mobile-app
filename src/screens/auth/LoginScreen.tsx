import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, Image, Pressable, StatusBar, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Svg, { Path } from 'react-native-svg';

import { EMAIL_REGEX } from '@/constants';
import { EyeIcon, EyeSlash, LockIcon, WhatsAppIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { resetAuth } from '@/store/auth/authSlice';
import { authActions } from '@/store/auth/authActions';
import { useAppDispatch, useAppSelector } from '@/hooks';

import { Button, Icon, AuthButton } from '@/components-next';
import { selectInstallationUrl } from '@/store/settings/settingsSelectors';
import { selectIsLoggingIn } from '@/store/auth/authSelectors';
import { SsoUtils } from '@/utils/ssoUtils';
import { openURL } from '@/utils/urlUtils';

type FormData = {
  email: string;
  password: string;
};

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || '';

const AppleIcon = () => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.72 13.03C16.7 10.65 18.67 9.51 18.76 9.45C17.64 7.81 15.9 7.59 15.29 7.57C13.83 7.42 12.41 8.44 11.67 8.44C10.91 8.44 9.77 7.59 8.54 7.62C6.95 7.64 5.47 8.57 4.65 10.03C2.97 12.93 4.22 17.19 5.83 19.54C6.64 20.69 7.58 21.98 8.81 21.93C10.02 21.88 10.47 21.17 11.93 21.17C13.38 21.17 13.8 21.93 15.06 21.9C16.35 21.88 17.17 20.74 17.95 19.58C18.88 18.26 19.25 16.96 19.27 16.89C19.24 16.88 16.75 15.93 16.72 13.03ZM14.34 6.02C14.99 5.21 15.44 4.12 15.31 3C14.37 3.04 13.19 3.65 12.52 4.44C11.92 5.14 11.38 6.27 11.53 7.35C12.59 7.43 13.66 6.81 14.34 6.02Z"
      fill="#111827"
    />
  </Svg>
);

const GoogleIcon = () => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.6 12.23C21.6 11.55 21.54 10.9 21.43 10.27H12V14.04H17.4C17.16 15.25 16.45 16.28 15.39 16.97V19.42H18.55C20.4 17.71 21.6 15.2 21.6 12.23Z"
      fill="#4285F4"
    />
    <Path
      d="M12 22C14.7 22 16.97 21.11 18.55 19.42L15.39 16.97C14.52 17.55 13.41 17.89 12 17.89C9.39 17.89 7.18 16.13 6.39 13.76H3.13V16.29C4.7 19.4 7.92 22 12 22Z"
      fill="#34A853"
    />
    <Path
      d="M6.39 13.76C6.19 13.18 6.08 12.55 6.08 11.9C6.08 11.25 6.19 10.62 6.39 10.04V7.51H3.13C2.47 8.83 2.1 10.32 2.1 11.9C2.1 13.48 2.47 14.97 3.13 16.29L6.39 13.76Z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.91C13.47 5.91 14.78 6.42 15.82 7.41L18.62 4.61C16.96 3.06 14.69 2.1 12 2.1C7.92 2.1 4.7 4.4 3.13 7.51L6.39 10.04C7.18 7.67 9.39 5.91 12 5.91Z"
      fill="#EA4335"
    />
  </Svg>
);

type SocialLoginButtonProps = {
  icon: React.ReactNode;
  text: string;
};

const SocialLoginButton = ({ icon, text }: SocialLoginButtonProps) => (
  <Pressable
    onPress={() => {}}
    style={tailwind.style(
      'h-11 flex-row items-center justify-center rounded-[13px] border-[1px] border-blackA-A4 bg-white',
    )}>
    <View style={tailwind.style('absolute left-4 h-5 w-5 items-center justify-center')}>
      {icon}
    </View>
    <Animated.Text
      style={tailwind.style(
        'text-base font-inter-medium-24 leading-[20px] tracking-[0.16px] text-gray-950',
      )}>
      {text}
    </Animated.Text>
  </Pressable>
);

const LoginScreen = () => {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const dispatch = useAppDispatch();
  const isLoggingIn = useAppSelector(selectIsLoggingIn);

  const installationUrl = useAppSelector(selectInstallationUrl);

  useEffect(() => {
    dispatch(resetAuth());
  }, [dispatch]);

  const onSubmit = async (data: FormData) => {
    const { email, password } = data;
    // Clear any existing auth state before login
    dispatch(resetAuth());

    try {
      const result = await dispatch(authActions.login({ email, password })).unwrap();

      // Check if MFA is required in the response
      if ('mfa_required' in result && result.mfa_required) {
        // Navigate directly to MFA screen with the token
        navigation.navigate('MFAScreen' as never);
      }
      // If MFA not required, the auth state will be updated and
      // the app will automatically navigate to the dashboard
    } catch {
      // Login error is handled by Redux and displayed in the UI
    }
  };

  // TODO: Change this condition based on EE check
  // Show SSO login button only if installation URL contains app.chatwoot.com
  const showSsoLogin = installationUrl.includes('app.chatwoot.com');

  const openResetPassword = () => {
    navigation.navigate('ResetPassword' as never);
  };

  const openTerms = () => {
    if (TERMS_URL) {
      openURL({ URL: TERMS_URL });
    }
  };

  const handleSsoLogin = async () => {
    if (!installationUrl) {
      return;
    }

    try {
      const result = await SsoUtils.loginWithSSO(installationUrl);

      if (result.type === 'success' && result.url) {
        const ssoParams = SsoUtils.parseCallbackUrl(result.url);
        await SsoUtils.handleSsoCallback(ssoParams, dispatch);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // SSO login error handled silently
    }
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-white')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-white')}
        barStyle={'dark-content'}
      />
      <View style={tailwind.style('flex-1 bg-white')}>
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
          contentContainerStyle={tailwind.style('flex-grow justify-center px-6 py-10')}>
          <View style={tailwind.style('items-center')}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
              source={require('../../../assets/icon.png')}
              style={tailwind.style('w-[88px] h-[88px]')}
              resizeMode="contain"
            />
          </View>
          <View style={tailwind.style('items-center pt-8 gap-3')}>
            <Animated.Text
              style={tailwind.style('text-2xl text-center text-gray-950 font-inter-semibold-20')}>
              {i18n.t('LOGIN.TITLE')}
            </Animated.Text>
            <Animated.Text
              style={tailwind.style(
                'text-center font-inter-normal-20 leading-[18px] tracking-[0.32px] text-gray-900',
              )}>
              {i18n.t('LOGIN.DESCRIPTION')}
            </Animated.Text>
          </View>

          {showSsoLogin && (
            <View>
              <AuthButton
                text={i18n.t('LOGIN.LOGIN_VIA_SSO')}
                icon={<LockIcon />}
                handlePress={handleSsoLogin}
                disabled={isLoggingIn}
                variant="outline"
                style={tailwind.style('mt-8')}
              />

              <View style={tailwind.style('flex-row items-center my-6')}>
                <View style={tailwind.style('flex-1 h-px bg-gray-300')} />
                <Animated.Text style={tailwind.style('px-4 text-sm text-gray-600')}>
                  OR
                </Animated.Text>
                <View style={tailwind.style('flex-1 h-px bg-gray-300')} />
              </View>
            </View>
          )}

          <Controller
            control={control}
            rules={{
              required: i18n.t('LOGIN.EMAIL_REQUIRED'),
              pattern: {
                value: EMAIL_REGEX,
                message: i18n.t('LOGIN.EMAIL_ERROR'),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={tailwind.style('pt-8 gap-2')}>
                <TextInput
                  style={[
                    tailwind.style(
                      'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
                      'py-2 px-3 rounded-xl text-gray-950 bg-blackA-A4',
                      'h-10',
                    ),
                  ]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder={i18n.t('LOGIN.EMAIL')}
                  placeholderTextColor={tailwind.color('text-gray-500')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && (
                  <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                    {errors.email.message}
                  </Animated.Text>
                )}
              </View>
            )}
            name="email"
          />

          <Controller
            control={control}
            rules={{
              required: i18n.t('LOGIN.PASSWORD_REQUIRED'),
              minLength: {
                value: 6,
                message: i18n.t('LOGIN.PASSWORD_ERROR'),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={tailwind.style('pt-5 gap-2')}>
                <View style={tailwind.style('relative')}>
                  <TextInput
                    style={[
                      tailwind.style(
                        'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
                        'py-2 pl-3 pr-10 rounded-xl text-gray-950 bg-blackA-A4',
                        'h-10',
                      ),
                    ]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder={i18n.t('LOGIN.PASSWORD')}
                    placeholderTextColor={tailwind.color('text-gray-500')}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    style={tailwind.style('absolute right-4 top-2.5')}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Icon size={20} icon={showPassword ? <EyeIcon /> : <EyeSlash />} />
                  </Pressable>
                </View>
                {errors.password && (
                  <Animated.Text style={tailwind.style('text-ruby-900')}>
                    {errors.password.message}
                  </Animated.Text>
                )}
              </View>
            )}
            name="password"
          />

          <Pressable style={tailwind.style('items-center pt-1 mb-8')} onPress={openResetPassword}>
            <Animated.Text style={tailwind.style('text-blue-800 font-inter-medium-24 text-center')}>
              {i18n.t('LOGIN.FORGOT_PASSWORD')}
            </Animated.Text>
          </Pressable>

          <Button
            text={isLoggingIn ? i18n.t('LOGIN.LOGIN_LOADING') : i18n.t('LOGIN.LOGIN')}
            handlePress={handleSubmit(onSubmit)}
          />
          <View style={tailwind.style('flex-row items-center my-6')}>
            <View style={tailwind.style('flex-1 h-px bg-blackA-A4')} />
            <Animated.Text
              style={tailwind.style('px-4 text-sm font-inter-420-20 leading-[17px] text-gray-800')}>
              {i18n.t('LOGIN.OR')}
            </Animated.Text>
            <View style={tailwind.style('flex-1 h-px bg-blackA-A4')} />
          </View>
          <View style={tailwind.style('gap-3')}>
            <SocialLoginButton icon={<AppleIcon />} text={i18n.t('LOGIN.CONTINUE_WITH_APPLE')} />
            <SocialLoginButton icon={<GoogleIcon />} text={i18n.t('LOGIN.CONTINUE_WITH_GOOGLE')} />
            <SocialLoginButton
              icon={<WhatsAppIcon />}
              text={i18n.t('LOGIN.CONTINUE_WITH_WHATSAPP')}
            />
          </View>
          <View style={tailwind.style('mt-6 flex-row flex-wrap justify-center px-2')}>
            <Animated.Text
              style={tailwind.style(
                'text-center text-sm font-inter-normal-20 leading-[18px] text-gray-800',
              )}>
              {i18n.t('LOGIN.TERMS_PREFIX')}{' '}
            </Animated.Text>
            <Pressable onPress={openTerms} hitSlop={8}>
              <Animated.Text
                style={tailwind.style('text-sm font-inter-medium-24 leading-[18px] text-blue-800')}>
                {i18n.t('LOGIN.TERMS_OF_USE')}
              </Animated.Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
