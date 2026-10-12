package com.employee.management.security;

import com.employee.management.document.UserDocument;
import com.employee.management.repository.es.EsUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final EsUserRepository esUserRepository;

    public CustomUserDetailsService(EsUserRepository esUserRepository) {
        this.esUserRepository = esUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<UserDocument> esUser = esUserRepository.findByEmail(email);
        if (esUser.isPresent()) {
            UserDocument user = esUser.get();
            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPasswordHash(),
                    List.of(new SimpleGrantedAuthority(user.getRole().name()))
            );
        }

        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}